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

  for (const gene of genes) {
    await prisma.gene.upsert({
      where: { geneId: gene.geneId },
      update: {},
      create: gene,
    });
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

  for (const source of sources) {
    await prisma.source.upsert({
      where: { name: source.name },
      update: {},
      create: source,
    });
  }

  console.log('✅ Annotation sources created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });