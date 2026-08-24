/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  experimental: {
    // Phosphor dan recharts diekspor via barrel; optimasi ini memangkas bundel.
    optimizePackageImports: ['@phosphor-icons/react', 'recharts'],
  },
};

export default nextConfig;
