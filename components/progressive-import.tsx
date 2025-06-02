// components/progressive-import.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye,
  Download,
  RefreshCw,
  Play,
  Pause,
  SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  previewRows: number;
}

interface ImportProgress {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  currentBatch: number;
  errors: ValidationError[];
  status: 'idle' | 'validating' | 'importing' | 'completed' | 'paused' | 'cancelled';
}

interface ProgressiveImportProps {
  acceptedTypes: string[];
  onImportComplete: (result: any) => void;
  validateRow?: (row: Record<string, string>, rowIndex: number) => ValidationError[];
  transformRow?: (row: Record<string, string>) => Record<string, any>;
  batchSize?: number;
}

export function ProgressiveImport({
  acceptedTypes,
  onImportComplete,
  validateRow,
  transformRow,
  batchSize = 100,
}: ProgressiveImportProps) {
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    processed: 0,
    total: 0,
    successful: 0,
    failed: 0,
    currentBatch: 0,
    errors: [],
    status: 'idle',
  });
  const [step, setStep] = useState<'upload' | 'preview' | 'validate' | 'import'>('upload');

  // File validation
  const validateFile = useCallback((file: File): boolean => {
    const isValidType = acceptedTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type.replace('*', ''))
    );
    
    if (!isValidType) {
      toast({
        title: 'Invalid file type',
        description: `Please select a file with one of these types: ${acceptedTypes.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 100MB',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }, [acceptedTypes, toast]);

  // Parse CSV file for preview
  const parseFilePreview = useCallback(async (file: File): Promise<PreviewData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            throw new Error('File is empty');
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const rows = lines.slice(1, 11).map(line => // Preview first 10 rows
            line.split(',').map(cell => cell.trim().replace(/"/g, ''))
          );

          resolve({
            headers,
            rows,
            totalRows: lines.length - 1,
            previewRows: Math.min(10, lines.length - 1),
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    if (!validateFile(uploadedFile)) return;

    setFile(uploadedFile);
    setStep('preview');
    
    try {
      const preview = await parseFilePreview(uploadedFile);
      setPreviewData(preview);
      
      toast({
        title: 'File loaded',
        description: `Preview ready: ${preview.totalRows} rows found`,
      });
    } catch (error) {
      toast({
        title: 'Parse error',
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: 'destructive',
      });
      setStep('upload');
    }
  }, [validateFile, parseFilePreview, toast]);

  // Data validation
  const validateData = useCallback(async () => {
    if (!file || !previewData || !validateRow) return;

    setStep('validate');
    setImportProgress(prev => ({ ...prev, status: 'validating' }));
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const errors: ValidationError[] = [];
      
      // Validate each row
      lines.slice(1).forEach((line, index) => {
        const values = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
        const rowData = headers.reduce((obj, header, i) => {
          obj[header] = values[i] || '';
          return obj;
        }, {} as Record<string, string>);
        
        const rowErrors = validateRow(rowData, index + 1);
        errors.push(...rowErrors);
      });
      
      setValidationErrors(errors);
      setImportProgress(prev => ({ 
        ...prev, 
        status: 'idle',
        total: lines.length - 1,
        errors: errors.filter(e => e.severity === 'error'),
      }));
      
      toast({
        title: 'Validation complete',
        description: `${errors.length} issues found (${errors.filter(e => e.severity === 'error').length} errors, ${errors.filter(e => e.severity === 'warning').length} warnings)`,
        variant: errors.filter(e => e.severity === 'error').length > 0 ? 'destructive' : 'default',
      });
    };
    
    reader.readAsText(file);
  }, [file, previewData, validateRow, toast]);

  // Start import process
  const startImport = useCallback(async () => {
    if (!file || !previewData) return;

    setStep('import');
    setImportProgress(prev => ({ 
      ...prev, 
      status: 'importing',
      processed: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
    }));

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const totalRows = lines.length - 1;
      
      // Process in batches
      for (let i = 1; i < lines.length; i += batchSize) {
        if (importProgress.status === 'cancelled') break;
        
        const batch = lines.slice(i, i + batchSize);
        const batchData = batch.map(line => {
          const values = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
          const rowData = headers.reduce((obj, header, j) => {
            obj[header] = values[j] || '';
            return obj;
          }, {} as Record<string, string>);
          
          return transformRow ? transformRow(rowData) : rowData;
        });

        try {
          // Send batch to API
          const response = await fetch('/api/import/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: batchData }),
          });

          if (!response.ok) throw new Error('Batch import failed');
          
          const result = await response.json();
          
          setImportProgress(prev => ({
            ...prev,
            processed: prev.processed + batch.length,
            successful: prev.successful + result.successful,
            failed: prev.failed + result.failed,
            currentBatch: prev.currentBatch + 1,
          }));

          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          setImportProgress(prev => ({
            ...prev,
            processed: prev.processed + batch.length,
            failed: prev.failed + batch.length,
            currentBatch: prev.currentBatch + 1,
          }));
        }
      }

      setImportProgress(prev => ({ ...prev, status: 'completed' }));
      
      toast({
        title: 'Import completed',
        description: `${importProgress.successful} records imported successfully`,
      });
      
      onImportComplete({
        total: totalRows,
        successful: importProgress.successful,
        failed: importProgress.failed,
      });
    };
    
    reader.readAsText(file);
  }, [file, previewData, batchSize, transformRow, importProgress.status, onImportComplete, toast]);

  // Control import process
  const pauseImport = () => {
    setImportProgress(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeImport = () => {
    setImportProgress(prev => ({ ...prev, status: 'importing' }));
  };

  const cancelImport = () => {
    setImportProgress(prev => ({ ...prev, status: 'cancelled' }));
    setStep('upload');
    setFile(null);
    setPreviewData(null);
  };

  // Reset to start
  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setValidationErrors([]);
    setImportProgress({
      processed: 0,
      total: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
      errors: [],
      status: 'idle',
    });
  };

  // Summary stats
  const errorStats = useMemo(() => {
    const errors = validationErrors.filter(e => e.severity === 'error').length;
    const warnings = validationErrors.filter(e => e.severity === 'warning').length;
    return { errors, warnings };
  }, [validationErrors]);

  const progressPercentage = importProgress.total > 0 
    ? (importProgress.processed / importProgress.total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {['upload', 'preview', 'validate', 'import'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepName ? 'bg-primary text-primary-foreground' :
                ['upload', 'preview', 'validate', 'import'].indexOf(step) > index ? 'bg-green-500 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {['upload', 'preview', 'validate', 'import'].indexOf(step) > index ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div className={`w-8 h-0.5 ${
                  ['upload', 'preview', 'validate', 'import'].indexOf(step) > index ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {step !== 'upload' && (
          <Button variant="outline" onClick={resetImport}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        )}
      </div>

      {/* Step content */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                if (files[0]) handleFileUpload(files[0]);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = acceptedTypes.join(',');
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files?.[0]) handleFileUpload(files[0]);
                };
                input.click();
              }}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drop your file here</h3>
              <p className="text-muted-foreground mb-4">
                Or click to browse files
              </p>
              <p className="text-sm text-muted-foreground">
                Supported formats: {acceptedTypes.join(', ')} • Max size: 100MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && previewData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>File Preview</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {previewData.totalRows} rows total
                </Badge>
                <Badge variant="outline">
                  {previewData.headers.length} columns
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Showing first {previewData.previewRows} rows of {previewData.totalRows} total rows.
                Review the data structure before proceeding.
              </AlertDescription>
            </Alert>

            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.headers.map((header, index) => (
                      <TableHead key={index} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="max-w-32 truncate">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <div className="space-x-2">
                {validateRow && (
                  <Button onClick={validateData}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Validate Data
                  </Button>
                )}
                <Button onClick={startImport}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'validate' && (
        <Card>
          <CardHeader>
            <CardTitle>Data Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="errors">
                  Errors ({errorStats.errors})
                </TabsTrigger>
                <TabsTrigger value="warnings">
                  Warnings ({errorStats.warnings})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {(previewData?.totalRows || 0) - errorStats.errors}
                      </div>
                      <p className="text-sm text-muted-foreground">Valid rows</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-red-600">
                        {errorStats.errors}
                      </div>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-yellow-600">
                        {errorStats.warnings}
                      </div>
                      <p className="text-sm text-muted-foreground">Warnings</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('preview')}>
                    Back to Preview
                  </Button>
                  <Button 
                    onClick={startImport}
                    disabled={errorStats.errors > 0}
                  >
                    {errorStats.errors > 0 ? 'Fix Errors First' : 'Proceed with Import'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="errors">
                <div className="rounded-md border max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Column</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationErrors
                        .filter(error => error.severity === 'error')
                        .map((error, index) => (
                          <TableRow key={index}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.column}</TableCell>
                            <TableCell className="font-mono max-w-32 truncate">
                              {error.value}
                            </TableCell>
                            <TableCell className="text-red-600">
                              {error.error}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="warnings">
                <div className="rounded-md border max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Column</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Warning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationErrors
                        .filter(error => error.severity === 'warning')
                        .map((error, index) => (
                          <TableRow key={index}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.column}</TableCell>
                            <TableCell className="font-mono max-w-32 truncate">
                              {error.value}
                            </TableCell>
                            <TableCell className="text-yellow-600">
                              {error.error}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {step === 'import' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Import Progress</CardTitle>
              <div className="flex items-center space-x-2">
                {importProgress.status === 'importing' && (
                  <Button variant="outline" size="sm" onClick={pauseImport}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                {importProgress.status === 'paused' && (
                  <Button variant="outline" size="sm" onClick={resumeImport}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={cancelImport}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{importProgress.processed} of {importProgress.total} processed</span>
                <span>Batch {importProgress.currentBatch}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importProgress.successful}
                  </div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importProgress.failed}
                  </div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {importProgress.total - importProgress.processed}
                  </div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </CardContent>
              </Card>
            </div>

            {/* Status message */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {importProgress.status === 'importing' && 'Import in progress...'}
                {importProgress.status === 'paused' && 'Import paused. Click Resume to continue.'}
                {importProgress.status === 'completed' && 'Import completed successfully!'}
                {importProgress.status === 'cancelled' && 'Import was cancelled.'}
              </AlertDescription>
            </Alert>

            {importProgress.status === 'completed' && (
              <div className="flex justify-center">
                <Button onClick={resetImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Another File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}