import { ModernHeader } from "./modern-header";


interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}