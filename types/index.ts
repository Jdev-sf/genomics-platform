// User types
export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Gene types (per dopo)
export interface Gene {
  id: string;
  symbol: string;
  name: string;
  chromosome?: string;
}

// Variant types (per dopo)
export interface Variant {
  id: string;
  name: string;
  geneId: string;
  position: number;
  clinicalSignificance?: string;
}