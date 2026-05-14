import type { NextConfig } from "next";

// Trigger restart

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true, // Keep this if we ever do partial export, but fine for standalone too
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        'localhost:3000', 
        'localhost:3001', 
        'www.5starambassador.com',
        'capacitor://localhost', 
        'http://localhost',
        process.env.VERCEL_URL || '5starambassador.com'
      ],
    },
  },
  // @ts-ignore - allowedDevOrigins is a new feature in Next.js 14.2+
  allowedDevOrigins: ['127.0.0.1:3001', 'localhost:3001', 'capacitor://localhost', 'http://localhost'],
  env: {
    // Expose APP URL to client preference: process.env > calculated fallback
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.5starambassador.com'),
  },
  typescript: {
    // Type checking is now enforced — remove this comment if all types pass cleanly
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // Required for Capacitor mobile access
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          }
        ]
      }
    ]
  },


};

export default nextConfig;
