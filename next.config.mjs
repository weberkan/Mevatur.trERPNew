/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production için standalone output (Docker optimizasyonu)
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Production optimizasyonları
  compress: true,
  poweredByHeader: false,
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
}

export default nextConfig
