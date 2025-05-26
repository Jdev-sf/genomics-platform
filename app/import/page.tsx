'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Loader2, X, Database, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

interface RecentImport {
  id: string;
  type: string;
  results: ImportResult;
  createdAt: string;
}

interface ImportStats {
  totalGenes: number;
  totalVariants: number;
  totalAnnotations: number;
}

export default function ImportPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'genes' | 'variants'>('genes');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      const response = await fetch('/api/import/progress');
      if (response.ok) {
        const data = await response.json();
        setRecentImports(data.data.recentImports);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching import history:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast({
          title: 'Invalid file format',
          description: 'Please select a CSV or JSON file.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok) {
        setImportResult(data.results);
        toast({
          title: 'Import completed',
          description: data.message,
          variant: data.results.failed > 0 ? 'default' : 'default',
        });
        fetchImportHistory();
      } else {
        toast({
          title: 'Import failed',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import error',
        description: 'An error occurred during import.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const downloadTemplate = (type: 'genes' | 'variants') => {
    const templates = {
      genes: {
        headers: ['gene_id', 'symbol', 'name', 'chromosome', 'start_position', 'end_position', 'strand', 'biotype', 'description'],
        example: ['HGNC:1234', 'GENE1', 'Gene 1 name', '1', '1000000', '1100000', '+', 'protein_coding', 'Example gene'],
      },
      variants: {
        headers: ['variant_id', 'gene_symbol', 'chromosome', 'position', 'reference_allele', 'alternate_allele', 'variant_type', 'consequence', 'impact', 'protein_change', 'clinical_significance', 'frequency'],
        example: ['rs12345', 'GENE1', '1', '1050000', 'A', 'G', 'SNV', 'missense_variant', 'MODERATE', 'p.Arg123Gln', 'Pathogenic', '0.001'],
      },
    };

    const template = templates[type];
    const csv = [template.headers.join(','), template.example.join(',')].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Import</h1>
        <p className="text-muted-foreground mt-1">
          Import genes and variants from CSV or JSON files
        </p>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Genes</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGenes.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVariants.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnnotations.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Configuration</CardTitle>
              <CardDescription>
                Select the type of data you want to import and upload your file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Data Type</p>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="genes"
                      checked={importType === 'genes'}
                      onChange={(e) => setImportType(e.target.value as 'genes' | 'variants')}
                      className="w-4 h-4"
                    />
                    <span>Genes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="variants"
                      checked={importType === 'variants'}
                      onChange={(e) => setImportType(e.target.value as 'genes' | 'variants')}
                      className="w-4 h-4"
                    />
                    <span>Variants</span>
                  </label>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">File Upload</p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFile}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-600">
                        Drop your file here, or{' '}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 hover:underline"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports CSV and JSON files
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate(importType)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-gray-500">
                    Processing your file...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{importResult.total}</p>
                    <p className="text-sm text-gray-500">Total Records</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{importResult.successful}</p>
                    <p className="text-sm text-gray-500">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-sm text-gray-500">Failed</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Import Errors</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-sm">
                            Row {error.row}: {error.error}
                          </p>
                        ))}
                        {importResult.errors.length > 5 && (
                          <p className="text-sm font-medium">
                            ...and {importResult.errors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Imports</CardTitle>
              <CardDescription>
                Your import history from the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentImports.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No import history found
                </p>
              ) : (
                <div className="space-y-4">
                  {recentImports.map((importItem) => (
                    <div
                      key={importItem.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {importItem.type}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(importItem.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-green-600">
                            {importItem.results.successful} successful
                          </span>
                          {importItem.results.failed > 0 && (
                            <span className="text-red-600">
                              {importItem.results.failed} failed
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress
                        value={(importItem.results.successful / importItem.results.total) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}