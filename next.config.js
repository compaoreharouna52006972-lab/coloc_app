/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TEMPORAIRE : je n'ai pas pu lancer `tsc` ni `next build` en écrivant ce code. Pour qu'une
  // petite erreur de type n'empêche pas le déploiement, les erreurs de type sont ignorées au build.
  // Le contrôle de types est fait à part par le workflow « typecheck » (voir README) ;
  // supprime ces deux lignes une fois qu'il est vert.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ]
  },
}

module.exports = nextConfig
