/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
       {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
    ],
  },
   webpack: (config, { isServer, webpack }) => {
    // Adiciona uma regra para carregar ficheiros .node como assets,
    // o que é necessário para dependências como oslo, bcrypt, argon2.
    config.module.rules.push({
      test: /\.node$/,
      use: [
        {
          loader: 'raw-loader',
          options: {
            esModule: false,
          },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
