import Link from 'next/link';
import { Database } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Database className="h-6 w-6" />
            <span className="text-xl font-semibold">Genomics Platform</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/genes" className="hover:text-primary">
              Genes
            </Link>
            <Link href="/variants" className="hover:text-primary">
              Variants
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}