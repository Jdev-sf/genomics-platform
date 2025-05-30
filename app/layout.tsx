import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeScript } from '@/components/theme-script';

// Initialize BigInt serialization fix
import '@/lib/setup-bigint-serialization';

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

// PWA install prompt component
function PWAInstallPrompt() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
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
        <ThemeScript />
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Genomics Platform" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Genomics Platform" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        
        {/* Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/splash-2048x2732.png" sizes="2048x2732" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1668x2224.png" sizes="1668x2224" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1536x2048.png" sizes="1536x2048" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.png" sizes="1125x2436" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1242x2208.png" sizes="1242x2208" />
        <link rel="apple-touch-startup-image" href="/icons/splash-750x1334.png" sizes="750x1334" />
        <link rel="apple-touch-startup-image" href="/icons/splash-640x1136.png" sizes="640x1136" />

        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//api.genomics-platform.com" />

        {/* Fallback for no-JS */}
        <noscript>
          <style>{`
            .no-js { display: none !important; }
            body { visibility: visible; }
          `}</style>
        </noscript>
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
            {children}
            <Toaster />
            
            {/* Offline indicator */}
            <div id="offline-indicator" className="hidden fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm z-50">
              You are currently offline. Some features may be limited.
            </div>

            {/* PWA Install Button */}
            <button
              id="install-button"
              className="hidden fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
            >
              Install App
            </button>
          </Providers>
        </ThemeProvider>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}