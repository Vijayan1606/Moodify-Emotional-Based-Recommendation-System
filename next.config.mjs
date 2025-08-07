/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Suppress console errors in production
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
