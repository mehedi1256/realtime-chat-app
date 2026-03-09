/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['emoji-picker-react'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
