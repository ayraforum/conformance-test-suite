/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true
  },
  transpilePackages: ['@demo/trqp', '@demo/core'],
  experimental: {
    esmExternals: false
  }
}

module.exports = nextConfig
