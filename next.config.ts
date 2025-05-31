import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA Configuration
  experimental: {
    // Enable optimizations
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    optimizeCss: true,
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Fix per development event listeners
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Headers for PWA
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ]
      }
    ];
  },

  // Webpack configuration for PWA and chunk stability
  webpack: (config, { dev, isServer }) => {
    // Service Worker handling
    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Improve chunk stability in development
    if (dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          // Separate chunk for large UI libraries
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|recharts)[\\/]/,
            name: 'ui-vendor',
            priority: 10,
            chunks: 'all',
          },
        },
      };

      // Prevent chunk load errors in development
      config.output.chunkLoadTimeout = 30000;
    }

    // Bundle analyzer in development
    if (dev) {
      config.optimization.minimize = false;
    }

    // Fix per event listeners in development
    if (dev && isServer) {
      // Suppress warnings for development hot reload
      config.ignoreWarnings = [
        /MaxListenersExceededWarning/,
        /Critical dependency/,
      ];
    }

    return config;
  },

  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
    ];
  },

  // Rewrites for API routing
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ];
  },

  // TypeScript configuration
  typescript: {
    // Ignore build errors in development
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },

  // React strict mode
  reactStrictMode: true,

  // Output configuration for better caching
  // Generate standalone output for Docker deployment in production
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
  }),

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Reduce memory usage in development
    swcMinify: false,
    // Faster builds in development
    productionBrowserSourceMaps: false,
  }),
};

export default nextConfig;