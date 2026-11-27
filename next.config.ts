import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // fotos del 3D (pizza): no cambian entre despliegues → caché larga en el navegador y en Cloudflare
  async headers() {
    return [{ source: '/food/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' }] }];
  },
};

export default nextConfig;
