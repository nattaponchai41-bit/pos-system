import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  turbopack: {},
  webpack: (config) => {
    config.watchOptions = {
      ignored: /node_modules|\.git|[\\/]Windows[\\/]|[\\/]Program Files( \(x86\))?[\\/]|[\\/]ProgramData[\\/]|[\\/]\$Recycle\.Bin[\\/]|pagefile\.sys|hiberfil\.sys|swapfile\.sys|[\\/]Users[^\\/]+[\\/]AppData[\\/]/i,
      poll: false,
    }
    return config
  },
}

export default nextConfig
