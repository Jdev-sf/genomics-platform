// lib/vcf-parser.ts - VCF Parser Infrastructure
import { z } from 'zod';

// VCF Record Schema
const VCFRecordSchema = z.object({
  chromosome: z.string(),
  position: z.number(),
  id: z.string().optional(),
  reference: z.string(),
  alternate: z.string(),
  quality: z.number().optional(),
  filter: z.string().optional(),
  info: z.record(z.any()).optional(),
  format: z.string().optional(),
  samples: z.array(z.record(z.any())).optional(),
});

export type VCFRecord = z.infer<typeof VCFRecordSchema>;

export interface VCFHeader {
  fileformat: string;
  reference?: string;
  contigs: Array<{ id: string; length?: number }>;
  info: Array<{ id: string; number: string; type: string; description: string }>;
  format: Array<{ id: string; number: string; type: string; description: string }>;
  samples: string[];
}

export interface ParsedVCF {
  header: VCFHeader;
  records: VCFRecord[];
  stats: {
    totalRecords: number;
    chromosomes: string[];
    variantTypes: Record<string, number>;
  };
}

export class VCFParser {
  private static readonly VCF_CHROMOSOME_MAP: Record<string, string> = {
    '23': 'X',
    '24': 'Y',
    'MT': 'M',
    'chrM': 'M',
  };

  static async parseVCF(content: string): Promise<ParsedVCF> {
    const lines = content.split('\n').filter(line => line.trim());
    
    const headerLines = lines.filter(line => line.startsWith('#'));
    const dataLines = lines.filter(line => !line.startsWith('#') && line.trim());

    const header = this.parseHeader(headerLines);
    const records = await this.parseRecords(dataLines, header);
    const stats = this.generateStats(records);

    return {
      header,
      records,
      stats
    };
  }

  private static parseHeader(headerLines: string[]): VCFHeader {
    const header: VCFHeader = {
      fileformat: '',
      contigs: [],
      info: [],
      format: [],
      samples: []
    };

    for (const line of headerLines) {
      if (line.startsWith('##fileformat=')) {
        header.fileformat = line.split('=')[1];
      } else if (line.startsWith('##reference=')) {
        header.reference = line.split('=')[1];
      } else if (line.startsWith('##contig=')) {
        const contigMatch = line.match(/##contig=<ID=([^,>]+)(?:,length=(\d+))?/);
        if (contigMatch) {
          header.contigs.push({
            id: contigMatch[1],
            length: contigMatch[2] ? parseInt(contigMatch[2]) : undefined
          });
        }
      } else if (line.startsWith('##INFO=')) {
        const infoMatch = line.match(/##INFO=<ID=([^,]+),Number=([^,]+),Type=([^,]+),Description="([^"]+)"/);
        if (infoMatch) {
          header.info.push({
            id: infoMatch[1],
            number: infoMatch[2],
            type: infoMatch[3],
            description: infoMatch[4]
          });
        }
      } else if (line.startsWith('##FORMAT=')) {
        const formatMatch = line.match(/##FORMAT=<ID=([^,]+),Number=([^,]+),Type=([^,]+),Description="([^"]+)"/);
        if (formatMatch) {
          header.format.push({
            id: formatMatch[1],
            number: formatMatch[2],
            type: formatMatch[3],
            description: formatMatch[4]
          });
        }
      } else if (line.startsWith('#CHROM')) {
        // Column header line
        const columns = line.split('\t');
        header.samples = columns.slice(9); // Samples start from column 10
      }
    }

    return header;
  }

  private static async parseRecords(dataLines: string[], header: VCFHeader): Promise<VCFRecord[]> {
    const records: VCFRecord[] = [];

    for (const line of dataLines) {
      try {
        const record = this.parseRecord(line, header);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        console.warn(`Skipping invalid VCF record: ${line}`, error);
      }
    }

    return records;
  }

  private static parseRecord(line: string, header: VCFHeader): VCFRecord | null {
    const fields = line.split('\t');
    
    if (fields.length < 8) {
      throw new Error('Invalid VCF record: insufficient fields');
    }

    const [chrom, pos, id, ref, alt, qual, filter, info, format, ...sampleData] = fields;
    
    // Normalize chromosome
    const chromosome = this.normalizeChromosome(chrom);
    
    // Parse INFO field
    const parsedInfo: Record<string, any> = {};
    if (info && info !== '.') {
      for (const item of info.split(';')) {
        const [key, value] = item.split('=');
        parsedInfo[key] = value || true;
      }
    }

    // Parse samples if present
    const samples: Array<Record<string, any>> = [];
    if (format && sampleData.length > 0) {
      const formatFields = format.split(':');
      for (let i = 0; i < sampleData.length; i++) {
        const sampleValues = sampleData[i].split(':');
        const sample: Record<string, any> = {};
        for (let j = 0; j < formatFields.length; j++) {
          sample[formatFields[j]] = sampleValues[j] || '.';
        }
        samples.push(sample);
      }
    }

    return {
      chromosome,
      position: parseInt(pos),
      id: id !== '.' ? id : undefined,
      reference: ref,
      alternate: alt,
      quality: qual !== '.' ? parseFloat(qual) : undefined,
      filter: filter !== '.' ? filter : undefined,
      info: Object.keys(parsedInfo).length > 0 ? parsedInfo : undefined,
      format: format !== '.' ? format : undefined,
      samples: samples.length > 0 ? samples : undefined,
    };
  }

  private static normalizeChromosome(chrom: string): string {
    // Remove 'chr' prefix if present
    const normalized = chrom.replace(/^chr/i, '');
    
    // Map special chromosomes
    return this.VCF_CHROMOSOME_MAP[normalized] || normalized;
  }

  private static generateStats(records: VCFRecord[]): ParsedVCF['stats'] {
    const chromosomes = new Set<string>();
    const variantTypes: Record<string, number> = {};

    for (const record of records) {
      chromosomes.add(record.chromosome);
      
      // Determine variant type
      const refLen = record.reference.length;
      const altLen = record.alternate.length;
      
      let variantType: string;
      if (refLen === 1 && altLen === 1) {
        variantType = 'SNV';
      } else if (refLen > altLen) {
        variantType = 'DEL';
      } else if (refLen < altLen) {
        variantType = 'INS';
      } else {
        variantType = 'COMPLEX';
      }
      
      variantTypes[variantType] = (variantTypes[variantType] || 0) + 1;
    }

    return {
      totalRecords: records.length,
      chromosomes: Array.from(chromosomes).sort(),
      variantTypes
    };
  }

  // Convert VCF record to database format
  static convertToVariantData(record: VCFRecord, geneId?: string) {
    return {
      variantId: record.id || `${record.chromosome}_${record.position}_${record.reference}_${record.alternate}`,
      geneId: geneId || '', // To be resolved during import
      chromosome: record.chromosome,
      position: BigInt(record.position),
      referenceAllele: record.reference,
      alternateAllele: record.alternate,
      variantType: this.determineVariantType(record.reference, record.alternate),
      frequency: this.extractFrequency(record.info),
      clinicalSignificance: this.extractClinicalSignificance(record.info),
      metadata: {
        vcf: {
          quality: record.quality,
          filter: record.filter,
          info: record.info,
          samples: record.samples
        }
      }
    };
  }

  private static determineVariantType(ref: string, alt: string): string {
    if (ref.length === 1 && alt.length === 1) return 'SNV';
    if (ref.length > alt.length) return 'DEL';
    if (ref.length < alt.length) return 'INS';
    return 'COMPLEX';
  }

  private static extractFrequency(info?: Record<string, any>): number | null {
    if (!info) return null;
    
    // Common frequency fields in VCF
    const freqFields = ['AF', 'MAF', 'FREQ'];
    for (const field of freqFields) {
      if (info[field]) {
        const freq = parseFloat(info[field]);
        if (!isNaN(freq)) return freq;
      }
    }
    
    return null;
  }

  private static extractClinicalSignificance(info?: Record<string, any>): string | null {
    if (!info) return null;
    
    // ClinVar clinical significance
    if (info.CLNSIG) {
      return info.CLNSIG;
    }
    
    return null;
  }
}