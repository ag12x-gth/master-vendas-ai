/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  
  experimental: {
    cpus: 1,
  },
  
  webpack: (config, { dev, isServer }) => {
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
