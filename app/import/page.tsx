// app/import/page.tsx - PARTE 1/2
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  Database, 
  Activity,
  Dna,
  CheckCircle, 
  AlertCircle, 
  Download,
  Eye,
  Trash2,
  Loader2,
  Info,
  File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ModernHeader } from '@/components/layout/modern-header';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface ImportJob {
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  importType: 'genes' | 'variants' | 'vcf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordsProcessed: number;
  totalRecords: number;
  errors: Array<{ record: string; error: string }>;
  warnings: Array<{ record: string; message: string }>;
  createdAt: string;
  completedAt?: string;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ record: string; error: string }>;
  warnings: Array<{ record: string; message: string }>;
}

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [importType, setImportType] = useState<'genes' | 'variants' | 'vcf'>('vcf');
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(file => 
        file.type === 'text/csv' || 
        file.type === 'application/json' ||
        file.name.endsWith('.csv') || 
        file.name.endsWith('.json') ||
        file.name.endsWith('.vcf')
      );
      
      if (validFiles.length !== droppedFiles.length) {
        toast({
          title: 'Invalid files',
          description: 'Only CSV, JSON, and VCF files are supported.',
          variant: 'destructive',
        });
      }
      
      setFiles(prev => [...prev, ...validFiles]);
      
      // Auto-detect import type based on file extension
      if (validFiles.some(file => file.name.endsWith('.vcf'))) {
        setImportType('vcf');
      }
    }
  }, [toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      
      // Auto-detect import type
      if (selectedFiles.some(file => file.name.endsWith('.vcf'))) {
        setImportType('vcf');
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startImport = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Process files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create import job entry
        const newJob: ImportJob = {
          id: `job_${Date.now()}_${i}`,
          filename: file.name,
          fileSize: file.size,
          fileType: file.type || getFileType(file.name),
          importType: importType,
          status: 'processing',
          progress: 0,
          recordsProcessed: 0,
          totalRecords: 0,
          errors: [],
          warnings: [],
          createdAt: new Date().toISOString(),
        };

        setImportJobs(prev => [newJob, ...prev]);

        // Simulate progress for user feedback
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = prev + Math.random() * 5;
            return newProgress >= 90 ? 90 : newProgress;
          });
        }, 200);

        try {
          const formData = new FormData();
          formData.append('file', file);
          
          // Auto-detect type if VCF
          const detectedType = file.name.endsWith('.vcf') ? 'vcf' : importType;
          formData.append('type', detectedType);

          const response = await fetch('/api/import', {
            method: 'POST',
            body: formData,
          });

          clearInterval(progressInterval);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const result = await response.json();
          const importResult: ImportResult = result.results;

          // Update job with results
          setImportJobs(prev => prev.map(job => 
            job.id === newJob.id 
              ? {
                  ...job,
                  status: 'completed' as const,
                  progress: 100,
                  recordsProcessed: importResult.successful,
                  totalRecords: importResult.total,
                  errors: importResult.errors,
                  warnings: importResult.warnings,
                  completedAt: new Date().toISOString(),
                }
              : job
          ));

        } catch (error) {
          clearInterval(progressInterval);
          console.error(`Import error for ${file.name}:`, error);
          
          // Update job with error
          setImportJobs(prev => prev.map(job => 
            job.id === newJob.id 
              ? {
                  ...job,
                  status: 'failed' as const,
                  errors: [{ record: file.name, error: error instanceof Error ? error.message : 'Unknown error' }],
                  completedAt: new Date().toISOString(),
                }
              : job
          ));
        }

        // Update overall progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setFiles([]);
      
      toast({
        title: 'Import completed',
        description: `${files.length} file(s) processed successfully.`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'Failed to start import process.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const getFileType = (filename: string): string => {
    if (filename.endsWith('.csv')) return 'text/csv';
    if (filename.endsWith('.json')) return 'application/json';
    if (filename.endsWith('.vcf')) return 'text/vcf';
    return 'unknown';
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.vcf')) return <Dna className="h-5 w-5 text-purple-500" />;
    if (filename.endsWith('.csv')) return <FileText className="h-5 w-5 text-green-500" />;
    if (filename.endsWith('.json')) return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getImportTypeIcon = (type: string) => {
    switch (type) {
      case 'genes': return <Database className="h-5 w-5 text-blue-500" />;
      case 'variants': return <Activity className="h-5 w-5 text-green-500" />;
      case 'vcf': return <Dna className="h-5 w-5 text-purple-500" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: ImportJob['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusBadge = (status: ImportJob['status']) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'secondary',
      failed: 'destructive',
    } as const;

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // app/import/page.tsx - PARTE 2/2
// Continua dalla Parte 1...

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
            <p className="text-muted-foreground">
              Upload genomic datasets for analysis and integration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/import/templates')}>
              <Download className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">Upload Data</TabsTrigger>
            <TabsTrigger value="history">Import History ({importJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Import Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Select Import Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div 
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      importType === 'vcf' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setImportType('vcf')}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      importType === 'vcf' 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground'
                    }`}>
                      {importType === 'vcf' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <Label className="flex items-center space-x-3 cursor-pointer flex-1">
                      <Dna className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">VCF (Variant Call Format)</div>
                        <div className="text-sm text-muted-foreground">
                          Standard format for genomic variants (.vcf files)
                        </div>
                      </div>
                      <Badge variant="secondary">Recommended</Badge>
                    </Label>
                  </div>

                  <div 
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      importType === 'genes' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setImportType('genes')}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      importType === 'genes' 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground'
                    }`}>
                      {importType === 'genes' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <Label className="flex items-center space-x-3 cursor-pointer flex-1">
                      <Database className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">Gene Data</div>
                        <div className="text-sm text-muted-foreground">
                          Import gene information (.csv, .json)
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div 
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      importType === 'variants' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setImportType('variants')}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      importType === 'variants' 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground'
                    }`}>
                      {importType === 'variants' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <Label className="flex items-center space-x-3 cursor-pointer flex-1">
                      <Activity className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">Variant Data</div>
                        <div className="text-sm text-muted-foreground">
                          Import variant information (.csv, .json)
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getImportTypeIcon(importType)}
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Drag & Drop Area */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    accept={importType === 'vcf' ? '.vcf' : '.csv,.json,.vcf'}
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Drop files here or click to browse</p>
                      <p className="text-sm text-muted-foreground">
                        {importType === 'vcf' 
                          ? 'Supports VCF files up to 100MB'
                          : 'Supports CSV, JSON, and VCF files up to 100MB'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Selected Files ({files.length})</h3>
                      <Button
                        onClick={startImport}
                        disabled={uploading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Start Import
                          </>
                        )}
                      </Button>
                    </div>

                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Overall Progress</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(file.name)}
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.size)} • {getFileType(file.name)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={uploading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import Guidelines */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <h4 className="font-medium">Import Guidelines</h4>
                      <ul className="text-sm space-y-1">
                        {importType === 'vcf' ? (
                          <>
                            <li>• VCF files are automatically parsed for genes and variants</li>
                            <li>• Standard VCF 4.0+ format supported</li>
                            <li>• Gene annotations extracted from INFO fields</li>
                            <li>• Clinical significance from ClinVar annotations</li>
                          </>
                        ) : importType === 'genes' ? (
                          <>
                            <li>• Required fields: gene_id, symbol, name, chromosome</li>
                            <li>• Optional: start_position, end_position, strand, biotype, description</li>
                            <li>• CSV files should include headers in the first row</li>
                            <li>• Duplicate genes will be updated with new information</li>
                          </>
                        ) : (
                          <>
                            <li>• Required fields: variant_id, gene_symbol, chromosome, position, reference_allele, alternate_allele</li>
                            <li>• Optional: variant_type, consequence, clinical_significance, frequency</li>
                            <li>• Associated genes must exist in the database first</li>
                            <li>• Duplicate variants will be updated with new information</li>
                          </>
                        )}
                        <li>• Maximum file size: 100MB per file</li>
                        <li>• Multiple files can be processed simultaneously</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Import History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Import History
                  </CardTitle>
                  <Badge variant="secondary">{importJobs.length} jobs</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {importJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No imports yet</h3>
                    <p className="text-muted-foreground">
                      Upload your first file to get started with data import.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {importJobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(job.status)}
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-medium">{job.filename}</p>
                                <Badge variant="outline" className="text-xs">
                                  {job.importType.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(job.fileSize)} • Started {new Date(job.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(job.status)}
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {job.status === 'processing' && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{job.progress}%</span>
                            </div>
                            <Progress value={job.progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {job.recordsProcessed.toLocaleString()} of {job.totalRecords.toLocaleString()} records processed
                            </p>
                          </div>
                        )}

                        {job.status === 'completed' && (
                          <div className="space-y-2">
                            <div className="text-sm text-green-600 dark:text-green-400">
                              ✓ Successfully imported {job.recordsProcessed.toLocaleString()} of {job.totalRecords.toLocaleString()} records
                            </div>
                            
                            {job.warnings.length > 0 && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="font-medium mb-1">Warnings ({job.warnings.length})</div>
                                  <div className="max-h-20 overflow-y-auto text-xs space-y-1">
                                    {job.warnings.slice(0, 3).map((warning, index) => (
                                      <div key={index}>
                                        <span className="font-mono">{warning.record}</span>: {warning.message}
                                      </div>
                                    ))}
                                    {job.warnings.length > 3 && (
                                      <div className="text-muted-foreground">
                                        ...and {job.warnings.length - 3} more warnings
                                      </div>
                                    )}
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}

                            <div className="flex space-x-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push('/genes')}
                              >
                                <Database className="h-4 w-4 mr-1" />
                                View Genes
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push('/variants')}
                              >
                                <Activity className="h-4 w-4 mr-1" />
                                View Variants
                              </Button>
                            </div>
                          </div>
                        )}

                        {job.status === 'failed' && job.errors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="font-medium mb-1">Errors ({job.errors.length})</div>
                              <div className="max-h-20 overflow-y-auto text-xs space-y-1">
                                {job.errors.slice(0, 3).map((error, index) => (
                                  <div key={index}>
                                    <span className="font-mono">{error.record}</span>: {error.error}
                                  </div>
                                ))}
                                {job.errors.length > 3 && (
                                  <div className="opacity-80">
                                    ...and {job.errors.length - 3} more errors
                                  </div>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button 
                variant="outline" 
                className="flex items-center justify-center space-x-2 h-auto py-4"
                onClick={() => router.push('/import/templates')}
              >
                <Download className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Download Templates</div>
                  <div className="text-xs text-muted-foreground">CSV/JSON templates</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center space-x-2 h-auto py-4"
                onClick={() => router.push('/genes')}
              >
                <Database className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">View Genes</div>
                  <div className="text-xs text-muted-foreground">Browse gene database</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center space-x-2 h-auto py-4"
                onClick={() => router.push('/variants')}
              >
                <Activity className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">View Variants</div>
                  <div className="text-xs text-muted-foreground">Browse variant database</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}