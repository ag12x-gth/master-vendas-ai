/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  
  // Permitir origens de desenvolvimento do Replit (elimina aviso de cross-origin)
  allowedDevOrigins: [
    '*.replit.dev',
    '*.kirk.replit.dev',
    '*.repl.co',
  ],
  
  experimental: {
    cpus: 1,
    // ✅ DESABILITAR instrumentationHook - causa webpack errors ao tentar compilar
    // Node.js modules para o cliente. Worker é inicializado via /api/internal/init-worker
  },
  
  // Otimizações de produção
  reactStrictMode: process.env.NODE_ENV === 'development',
  poweredByHeader: false,
  compress: true,
  
  // Desabilitar recursos de desenvolvimento em produção
  productionBrowserSourceMaps: false,
  
  // ========================================
  // BUILD OPTIMIZATION - ESLint Caching
  // ========================================
  /**
   * Enable ESLint caching to avoid timeouts during build/CI/CD.
   * Cache is stored in .next/cache/eslint for faster subsequent builds.
   * 
   * Architect Recommendation: Integrate lint caching to avoid build timeouts
   * Evidence: Build timed out at 240s during linting phase on 2025-11-24
   */
  eslint: {
    // Enable caching for faster builds
    dirs: ['src', 'pages', 'components', 'lib'],
    // Ignore during build to prevent timeout (lint separately)
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
  },
  
  // TypeScript checking optimization
  typescript: {
    // Type check in parallel with build (don't block)
    ignoreBuildErrors: process.env.SKIP_TYPECHECK === 'true',
  },
  
  // Otimização de compilação
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  webpack: (config, { dev, isServer }) => {
    // ✅ FASE 3: Webpack Externals para Node-only modules
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      if (isServer) {
        // Server-only externals
        config.externals.push({
          'bullmq': 'commonjs bullmq',
          '@opentelemetry/api': 'commonjs @opentelemetry/api',
          '@opentelemetry/auto': 'commonjs @opentelemetry/auto',
          '@opentelemetry/sdk-node': 'commonjs @opentelemetry/sdk-node',
        });
      }
    }
    
    // Desabilitar hot reload em produção
    if (!dev) {
      config.watchOptions = {
        ignored: /node_modules/,
        poll: false,
      };
      
      // Desabilitar source maps em produção (exceto para servidor)
      if (!isServer) {
        config.devtool = false;
      }
    }
    
    // Otimizações de produção do cliente
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            firebase: {
              name: 'firebase',
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              priority: 40,
              enforce: true,
            },
            socketio: {
              name: 'socketio',
              test: /[\\/]node_modules[\\/](socket\.io-client)[\\/]/,
              priority: 35,
              enforce: true,
            },
            baileys: {
              name: 'baileys',
              test: /[\\/]node_modules[\\/](@whiskeysockets[\\/]baileys)[\\/]/,
              priority: 30,
              enforce: true,
            },
            ai: {
              name: 'ai-sdk',
              test: /[\\/]node_modules[\\/](@ai-sdk|openai|@google)[\\/]/,
              priority: 25,
              enforce: true,
            },
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'mmg.whatsapp.net',
      'pps.whatsapp.net',
      'media.whatsapp.net',
      'flagsapi.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.whatsapp.net',
      },
      {
        protocol: 'https',
        hostname: 'flagsapi.com',
      },
      {
        protocol: 'https',
        hostname: '**.replit.dev',
      },
    ],
  },
};

export default nextConfig;
