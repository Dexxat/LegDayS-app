/** Cabeceras de seguridad para todas las páginas. */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },                       // nadie puede meter el sitio en un iframe (clickjacking)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: { serverComponentsExternalPackages: ['jspdf'] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
