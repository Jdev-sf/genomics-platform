// app/layout.tsx - UPDATED with Keyboard Shortcuts
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeScript } from '@/components/theme-script';
import { KeyboardShortcutProvider } from '@/components/keyboard-shortcuts';

// Initialize BigInt serialization fix
import '@/lib/setup-bigint-serialization';
import { SmartHelp } from '@/components/contextual-help';
import { MobileNavigation } from '@/components/mobile/mobile-navigation';

// Initialize monitoring system
if (typeof window === 'undefined') {
  // Server-side only
  import('@/lib/setup-monitoring').then(({ initializeMonitoring }) => {
    try {
      initializeMonitoring();
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  });
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Genomics Platform',
    template: '%s | Genomics Platform'
  },
  description: 'Advanced genomic data visualization and analysis platform with AI-powered insights',
  keywords: ['genomics', 'genetics', 'variants', 'DNA', 'bioinformatics', 'medical genetics'],
  authors: [{ name: 'Genomics Platform Team' }],
  creator: 'Genomics Platform',
  publisher: 'Genomics Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://genomics-platform.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://genomics-platform.vercel.app',
    title: 'Genomics Platform',
    description: 'Advanced genomic data visualization and analysis platform',
    siteName: 'Genomics Platform',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Genomics Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Genomics Platform',
    description: 'Advanced genomic data visualization and analysis platform',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  category: 'healthcare',
  classification: 'Medical Research Tool',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Genomics Platform',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  colorScheme: 'light dark',
};

// PWA install prompt component with chunk error handler
function PWAInstallPrompt() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          // Chunk Load Error Handler
          window.addEventListener('unhandledrejection', (event) => {
            if (
              event.reason &&
              event.reason.message &&
              (event.reason.message.includes('ChunkLoadError') ||
               event.reason.message.includes('Loading chunk') ||
               event.reason.message.includes('Loading CSS chunk'))
            ) {
              console.warn('Chunk load error detected, reloading page...');
              event.preventDefault();
              window.location.reload();
            }
          });

          // Handle dynamic import errors
          window.addEventListener('error', (event) => {
            if (
              event.message &&
              (event.message.includes('Loading chunk') ||
               event.message.includes('ChunkLoadError'))
            ) {
              console.warn('Dynamic import chunk error, reloading...');
              window.location.reload();
            }
          });

          // PWA install prompt
          let deferredPrompt;
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button/banner
            const installButton = document.getElementById('install-button');
            if (installButton) {
              installButton.style.display = 'block';
              installButton.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                  if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                  } else {
                    console.log('User dismissed the A2HS prompt');
                  }
                  deferredPrompt = null;
                });
              });
            }
          });

          // Service Worker registration
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                  console.log('SW registered: ', registration);
                  
                  // Check for updates
                  registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content available, show refresh prompt
                        if (confirm('New version available! Refresh to update?')) {
                          window.location.reload();
                        }
                      }
                    });
                  });
                })
                .catch((registrationError) => {
                  console.log('SW registration failed: ', registrationError);
                });
            });
          }

          // Handle online/offline status
          window.addEventListener('online', () => {
            document.body.classList.remove('offline');
            console.log('Back online');
          });

          window.addEventListener('offline', () => {
            document.body.classList.add('offline');
            console.log('Gone offline');
          });

          // Performance monitoring
          window.addEventListener('load', () => {
            if ('performance' in window) {
              const perfData = performance.getEntriesByType('navigation')[0];
              console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }
          });

          // Keyboard shortcut helper text
          setTimeout(() => {
            const helpText = document.createElement('div');
            helpText.id = 'keyboard-help';
            helpText.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(0,0,0,0.8);color:white;padding:8px 12px;border-radius:6px;font-size:12px;z-index:1000;pointer-events:none;opacity:0;transition:opacity 0.3s;';
            helpText.textContent = 'Press ? for keyboard shortcuts';
            document.body.appendChild(helpText);
            
            // Show help text briefly
            setTimeout(() => helpText.style.opacity = '1', 2000);
            setTimeout(() => helpText.style.opacity = '0', 5000);
          }, 3000);
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Mantieni tutto l'head esistente */}
      </head>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange={true}
          storageKey="genomics-ui-theme"
        >
          <Providers>
            <KeyboardShortcutProvider>
              {/* NUOVA IMPLEMENTAZIONE MOBILE */}
              <MobileNavigation>
                {children}
              </MobileNavigation>
              
              <Toaster />
              
              {/* Smart Help - NEW UX FEATURE */}
              <SmartHelp />
              
              {/* Altri componenti esistenti */}
              <div id="offline-indicator" className="hidden fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm z-50">
                You are currently offline. Some features may be limited.
              </div>

              <button
                id="install-button"
                className="hidden fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
              >
                Install App
              </button>
            </KeyboardShortcutProvider>
          </Providers>
        </ThemeProvider>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}