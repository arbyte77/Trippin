// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "script-src 'self' https://maps.googleapis.com https://maps.gstatic.com",
              "'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https://*.googleapis.com https://*.gstatic.com",
              "connect-src 'self' https://*.googleapis.com https://*.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'none';",
              "object-src 'none';"
            ].join(' ').replace(/; /g, ' '),  // Proper CSP formatting
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  },
  // Add other Next.js config options here if needed
};

export default nextConfig;
