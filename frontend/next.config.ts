import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API requestlarini Yii2 ga proksi qilish
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost/o'quv-markaz/backend/api/web";
    return [
      {
        source: '/backend-api/:path*',
        destination: `${apiBase}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
    ],
  },
  // Build optimizatsiya
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
