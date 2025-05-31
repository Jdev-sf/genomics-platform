// app/import/page.tsx - UPDATED WITH PROGRESSIVE IMPORT
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  Database, 
  Activity,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ModernHeader } from '@/components/layout/modern-header';

// NEW UX COMPONENTS
import { ProgressiveImport } from '@/components/progressive-import';

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
}

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [importType, setImportType] = useState<'genes' | 'variants' | 'vcf'>('vcf');

  // Validation functions for different import types
  const validateGeneRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Required fields validation
    if (!row.gene_id?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'gene_id',
        value: row.gene_id || '',
        error: 'Gene ID is required',
        severity: 'error'
      });
    }
    
    if (!row.symbol?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'symbol',
        value: row.symbol || '',
        error: 'Gene symbol is required',
        severity: 'error'
      });
    }
    
    if (!row.chromosome?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'chromosome',
        value: row.chromosome || '',
        error: 'Chromosome is required',
        severity: 'error'
      });
    }
    
    // Chromosome validation
    const validChromosomes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
                             '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y', 'MT'];
    if (row.chromosome && !validChromosomes.includes(row.chromosome.toUpperCase())) {
      errors.push({
        row: rowIndex,
        column: 'chromosome',
        value: row.chromosome,
        error: 'Invalid chromosome value',
        severity: 'error'
      });
    }
    
    // Position validation
    if (row.start_position && row.end_position) {
      const start = parseInt(row.start_position);
      const end = parseInt(row.end_position);
      if (start >= end) {
        errors.push({
          row: rowIndex,
          column: 'start_position',
          value: row.start_position,
          error: 'Start position must be less than end position',
          severity: 'error'
        });
      }
    }
    
    // Warnings
    if (!row.name?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'name',
        value: row.name || '',
        error: 'Gene name is recommended',
        severity: 'warning'
      });
    }
    
    return errors;
  };

  const validateVariantRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Required fields validation
    if (!row.variant_id?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'variant_id',
        value: row.variant_id || '',
        error: 'Variant ID is required',
        severity: 'error'
      });
    }
    
    if (!row.gene_symbol?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'gene_symbol',
        value: row.gene_symbol || '',
        error: 'Gene symbol is required',
        severity: 'error'
      });
    }
    
    if (!row.chromosome?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'chromosome',
        value: row.chromosome || '',
        error: 'Chromosome is required',
        severity: 'error'
      });
    }
    
    if (!row.position?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'position',
        value: row.position || '',
        error: 'Position is required',
        severity: 'error'
      });
    }
    
    if (!row.reference_allele?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'reference_allele',
        value: row.reference_allele || '',
        error: 'Reference allele is required',
        severity: 'error'
      });
    }
    
    if (!row.alternate_allele?.trim()) {
      errors.push({
        row: rowIndex,
        column: 'alternate_allele',
        value: row.alternate_allele || '',
        error: 'Alternate allele is required',
        severity: 'error'
      });
    }
    
    // Position validation
    if (row.position && isNaN(parseInt(row.position))) {
      errors.push({
        row: rowIndex,
        column: 'position',
        value: row.position,
        error: 'Position must be a number',
        severity: 'error'
      });
    }
    
    // Allele validation
    const validBases = /^[ATCGN\-]+$/i;
    if (row.reference_allele && !validBases.test(row.reference_allele)) {
      errors.push({
        row: rowIndex,
        column: 'reference_allele',
        value: row.reference_allele,
        error: 'Invalid nucleotide sequence',
        severity: 'error'
      });
    }
    
    if (row.alternate_allele && !validBases.test(row.alternate_allele)) {
      errors.push({
        row: rowIndex,
        column: 'alternate_allele',
        value: row.alternate_allele,
        error: 'Invalid nucleotide sequence',
        severity: 'error'
      });
    }
    
    // Frequency validation
    if (row.frequency && (isNaN(parseFloat(row.frequency)) || parseFloat(row.frequency) < 0 || parseFloat(row.frequency) > 1)) {
      errors.push({
        row: rowIndex,
        column: 'frequency',
        value: row.frequency,
        error: 'Frequency must be between 0 and 1',
        severity: 'error'
      });
    }
    
    return errors;
  };

  const validateVcfRow = (row: Record<string, string>, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Basic VCF validation
    const requiredFields = ['CHROM', 'POS', 'ID', 'REF', 'ALT', 'QUAL', 'FILTER', 'INFO'];
    
    requiredFields.forEach(field => {
      if (!row[field]?.trim()) {
        errors.push({
          row: rowIndex,
          column: field,
          value: row[field] || '',
          error: `${field} is required in VCF format`,
          severity: 'error'
        });
      }
    });
    
    // Position validation
    if (row.POS && isNaN(parseInt(row.POS))) {
      errors.push({
        row: rowIndex,
        column: 'POS',
        value: row.POS,
        error: 'Position must be a number',
        severity: 'error'
      });
    }
    
    return errors;
  };

  // Transform functions for different import types
  const transformGeneRow = (row: Record<string, string>) => {
    return {
      gene_id: row.gene_id,
      symbol: row.symbol.toUpperCase(),
      name: row.name,
      chromosome: row.chromosome.toUpperCase(),
      start_position: row.start_position ? parseInt(row.start_position) : null,
      end_position: row.end_position ? parseInt(row.end_position) : null,
      strand: row.strand || null,
      biotype: row.biotype || null,
      description: row.description || null,
    };
  };

  const transformVariantRow = (row: Record<string, string>) => {
    return {
      variant_id: row.variant_id,
      gene_symbol: row.gene_symbol.toUpperCase(),
      chromosome: row.chromosome.toUpperCase(),
      position: parseInt(row.position),
      reference_allele: row.reference_allele.toUpperCase(),
      alternate_allele: row.alternate_allele.toUpperCase(),
      variant_type: row.variant_type || null,
      consequence: row.consequence || null,
      impact: row.impact || null,
      protein_change: row.protein_change || null,
      clinical_significance: row.clinical_significance || null,
      frequency: row.frequency ? parseFloat(row.frequency) : null,
    };
  };

  const transformVcfRow = (row: Record<string, string>) => {
    return {
      chromosome: row.CHROM,
      position: parseInt(row.POS),
      variant_id: row.ID,
      reference_allele: row.REF,
      alternate_allele: row.ALT,
      quality: row.QUAL ? parseFloat(row.QUAL) : null,
      filter: row.FILTER,
      info: row.INFO,
      format: row.FORMAT || null,
    };
  };

  // Get validation and transform functions based on import type
  const getValidationFunction = () => {
    switch (importType) {
      case 'genes': return validateGeneRow;
      case 'variants': return validateVariantRow;
      case 'vcf': return validateVcfRow;
      default: return undefined;
    }
  };

  const getTransformFunction = () => {
    switch (importType) {
      case 'genes': return transformGeneRow;
      case 'variants': return transformVariantRow;
      case 'vcf': return transformVcfRow;
      default: return undefined;
    }
  };

  // Get accepted file types based on import type
  const getAcceptedTypes = () => {
    switch (importType) {
      case 'vcf': return ['text/vcf', '.vcf'];
      case 'genes':
      case 'variants':
      default:
        return ['text/csv', 'application/json', '.csv', '.json'];
    }
  };

  // Handle import completion
  const handleImportComplete = (result: any) => {
    toast({
      title: 'Import completed!',
      description: `${result.successful} records imported successfully. ${result.failed} failed.`,
    });

    // Navigate to appropriate page based on import type
    setTimeout(() => {
      if (importType === 'genes') {
        router.push('/genes');
      } else if (importType === 'variants' || importType === 'vcf') {
        router.push('/variants');
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
            <p className="text-muted-foreground">
              Upload genomic datasets with advanced validation and preview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/import/templates')}>
              <Download className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </div>
        </div>

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
                <div className="flex items-center space-x-3 flex-1">
                  <Activity className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">VCF (Variant Call Format)</div>
                    <div className="text-sm text-muted-foreground">
                      Standard format for genomic variants (.vcf files) - Recommended
                    </div>
                  </div>
                </div>
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
                <div className="flex items-center space-x-3 flex-1">
                  <Database className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Gene Data</div>
                    <div className="text-sm text-muted-foreground">
                      Import gene information (.csv, .json)
                    </div>
                  </div>
                </div>
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
                <div className="flex items-center space-x-3 flex-1">
                  <Activity className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Variant Data</div>
                    <div className="text-sm text-muted-foreground">
                      Import variant information (.csv, .json)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PROGRESSIVE IMPORT COMPONENT - NEW UX FEATURE */}
        <ProgressiveImport
          acceptedTypes={getAcceptedTypes()}
          onImportComplete={handleImportComplete}
          validateRow={getValidationFunction()}
          transformRow={getTransformFunction()}
          batchSize={100}
        />

        {/* Import Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">File Requirements</h4>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      <li>Maximum file size: 100MB per file</li>
                      <li>Supported formats: {getAcceptedTypes().join(', ')}</li>
                      <li>UTF-8 encoding recommended</li>
                      <li>First row should contain column headers (for CSV/JSON)</li>
                    </ul>
                  </div>

                  {importType === 'genes' && (
                    <div>
                      <h4 className="font-medium mb-2">Gene Data Requirements</h4>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        <li><strong>Required:</strong> gene_id, symbol, name, chromosome</li>
                        <li><strong>Optional:</strong> start_position, end_position, strand, biotype, description</li>
                        <li>Gene symbols will be converted to uppercase</li>
                        <li>Duplicate genes will be updated with new information</li>
                      </ul>
                    </div>
                  )}

                  {importType === 'variants' && (
                    <div>
                      <h4 className="font-medium mb-2">Variant Data Requirements</h4>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        <li><strong>Required:</strong> variant_id, gene_symbol, chromosome, position, reference_allele, alternate_allele</li>
                        <li><strong>Optional:</strong> variant_type, consequence, clinical_significance, frequency</li>
                        <li>Associated genes must exist in the database first</li>
                        <li>Frequency must be between 0 and 1</li>
                      </ul>
                    </div>
                  )}

                  {importType === 'vcf' && (
                    <div>
                      <h4 className="font-medium mb-2">VCF File Requirements</h4>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        <li>Standard VCF 4.0+ format supported</li>
                        <li>Required columns: CHROM, POS, ID, REF, ALT, QUAL, FILTER, INFO</li>
                        <li>Gene annotations extracted from INFO fields automatically</li>
                        <li>Clinical significance from ClinVar annotations when available</li>
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Processing Features</h4>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      <li><strong>Preview:</strong> Review first 10 rows before import</li>
                      <li><strong>Validation:</strong> Real-time error and warning detection</li>
                      <li><strong>Batch Processing:</strong> Large files processed in chunks</li>
                      <li><strong>Progress Tracking:</strong> Monitor import progress in real-time</li>
                      <li><strong>Error Reporting:</strong> Detailed error logs with row numbers</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

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