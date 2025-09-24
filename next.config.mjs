/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled for server deployment
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
