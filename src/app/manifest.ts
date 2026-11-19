import type { MetadataRoute } from 'next';

/** Configuración para instalar la app en el celular ("Agregar a pantalla de inicio"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Burger POS — Pedidos desde tu mesa',
    short_name: 'Burger POS',
    description: 'Haz tu pedido directo desde tu mesa',
    start_url: '/menu',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fdf6e3',
    theme_color: '#d9261c',
    lang: 'es',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
