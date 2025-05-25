import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create roles
  const roles = [
    {
      name: 'admin',
      description: 'Full system access',
      permissions: {
        users: ['create', 'read', 'update', 'delete'],
        genes: ['create', 'read', 'update', 'delete'],
        variants: ['create', 'read', 'update', 'delete'],
        annotations: ['create', 'read', 'update', 'delete'],
        reports: ['create', 'read', 'export'],
      },
    },
    {
      name: 'researcher',
      description: 'Research access with export capabilities',
      permissions: {
        users: ['read'],
        genes: ['read'],
        variants: ['read'],
        annotations: ['read', 'create'],
        reports: ['create', 'read', 'export'],
      },
    },
    {
      name: 'clinician',
      description: 'Clinical access to validated data',
      permissions: {
        users: ['read'],
        genes: ['read'],
        variants: ['read'],
        annotations: ['read'],
        reports: ['read'],
      },
    },
    {
      name: 'viewer',
      description: 'Read-only access',
      permissions: {
        genes: ['read'],
        variants: ['read'],
        annotations: ['read'],
      },
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('✅ Roles created');

  // Create sample genes
  const genes = [
    {
      geneId: 'HGNC:1100',
      symbol: 'BRCA1',
      name: 'breast cancer type 1 susceptibility protein',
      chromosome: '17',
      startPosition: BigInt(43044295),
      endPosition: BigInt(43125483),
      strand: '-',
      biotype: 'protein_coding',
      description: 'BRCA1 DNA repair associated',
      metadata: {
        synonyms: ['RNF53', 'BRCC1'],
        externalIds: {
          ensembl: 'ENSG00000012048',
          entrez: '672',
          omim: '113705',
        },
      },
    },
    {
      geneId: 'HGNC:1101',
      symbol: 'BRCA2',
      name: 'breast cancer type 2 susceptibility protein',
      chromosome: '13',
      startPosition: BigInt(32315474),
      endPosition: BigInt(32400266),
      strand: '+',
      biotype: 'protein_coding',
      description: 'BRCA2 DNA repair associated',
      metadata: {
        synonyms: ['FANCD1', 'BRCC2'],
        externalIds: {
          ensembl: 'ENSG00000139618',
          entrez: '675',
          omim: '600185',
        },
      },
    },
    {
      geneId: 'HGNC:11998',
      symbol: 'TP53',
      name: 'tumor protein p53',
      chromosome: '17',
      startPosition: BigInt(7661779),
      endPosition: BigInt(7687550),
      strand: '-',
      biotype: 'protein_coding',
      description: 'Tumor suppressor p53',
      metadata: {
        synonyms: ['p53', 'TRP53'],
        externalIds: {
          ensembl: 'ENSG00000141510',
          entrez: '7157',
          omim: '191170',
        },
      },
    },
  ];

  const createdGenes = [];
  for (const gene of genes) {
    const created = await prisma.gene.upsert({
      where: { geneId: gene.geneId },
      update: {},
      create: gene,
    });
    createdGenes.push(created);
  }

  console.log('✅ Sample genes created');

  // Create annotation sources
  const sources = [
    {
      name: 'ClinVar',
      version: '2024.01',
      url: 'https://www.ncbi.nlm.nih.gov/clinvar/',
      description: 'NCBI ClinVar database of genomic variation and its relationship to human health',
      isActive: true,
    },
    {
      name: 'Ensembl',
      version: '111',
      url: 'https://www.ensembl.org/',
      description: 'Ensembl genome browser',
      isActive: true,
    },
  ];

  const createdSources = [];
  for (const source of sources) {
    const created = await prisma.source.upsert({
      where: { name: source.name },
      update: {},
      create: source,
    });
    createdSources.push(created);
  }

  console.log('✅ Annotation sources created');

  // Create variants for each gene
  console.log('Creating variants...');
  
  const clinicalSignificances = [
    'Pathogenic',
    'Likely pathogenic',
    'Uncertain significance',
    'Likely benign',
    'Benign',
    null
  ];
  
  const variantTypes = ['SNV', 'INDEL', 'DEL', 'INS'];
  const consequences = ['missense_variant', 'nonsense_variant', 'frameshift_variant', 'splice_variant', 'synonymous_variant'];
  const impacts = ['HIGH', 'MODERATE', 'LOW', 'MODIFIER'];
  
  for (const gene of createdGenes) {
    // Create 15-25 variants per gene
    const variantCount = Math.floor(Math.random() * 10) + 15;
    
    for (let i = 0; i < variantCount; i++) {
      const position = gene.startPosition 
        ? Number(gene.startPosition) + Math.floor(Math.random() * 1000)
        : Math.floor(Math.random() * 1000000);
      
      // Check if variant already exists
      const existingVariant = await prisma.variant.findUnique({
        where: { variantId: `${gene.symbol}_var_${i + 1}` }
      });

      if (!existingVariant) {
        const variant = await prisma.variant.create({
          data: {
            variantId: `${gene.symbol}_var_${i + 1}`,
            geneId: gene.id,
            chromosome: gene.chromosome || '1',
            position: BigInt(position),
            referenceAllele: ['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)],
            alternateAllele: ['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)],
            variantType: variantTypes[Math.floor(Math.random() * variantTypes.length)],
            consequence: consequences[Math.floor(Math.random() * consequences.length)],
            impact: impacts[Math.floor(Math.random() * impacts.length)],
            proteinChange: Math.random() > 0.5 ? `p.Arg${Math.floor(Math.random() * 500) + 1}Cys` : null,
            frequency: Math.random() > 0.7 ? Math.random() * 0.1 : null,
            clinicalSignificance: clinicalSignificances[Math.floor(Math.random() * clinicalSignificances.length)],
            metadata: {}
          }
        });
        
        // Add annotation for some variants
        if (Math.random() > 0.5 && createdSources.length > 0) {
          await prisma.annotation.create({
            data: {
              variantId: variant.id,
              sourceId: createdSources[0].id,
              annotationType: 'clinical',
              content: {
                interpretation: variant.clinicalSignificance || 'Not provided',
                evidence: ['PVS1', 'PM2', 'PP5'].slice(0, Math.floor(Math.random() * 3) + 1),
                reviewStatus: 'criteria provided'
              },
              confidenceScore: 0.5 + Math.random() * 0.5,
              evidenceLevel: ['Strong', 'Moderate', 'Limited'][Math.floor(Math.random() * 3)]
            }
          });
        }
      }
    }
  }
  
  console.log('✅ Variants created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });