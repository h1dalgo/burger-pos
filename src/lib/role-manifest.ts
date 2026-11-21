import type { Metadata, MetadataRoute } from 'next';
import { APP_BG, ROLE_APPS, type AppRole } from '@/lib/app-roles';

/** Manifest de la app instalable de una sección. */
export function roleManifest(role: AppRole): MetadataRoute.Manifest {
  const app = ROLE_APPS[role];
  const icon = (size: number) => (role === 'clientes' ? (size === 180 ? '/apple-icon' : '/icon') : `/icons/${role}?size=${size}`);
  return {
    // id distinto: en Android cada sección queda instalada como una app aparte
    id: app.startUrl,
    name: app.name,
    short_name: app.shortName,
    description: app.description,
    start_url: app.startUrl,
    scope: '/',
    display: 'standalone',
    orientation: app.orientation,
    background_color: APP_BG,
    theme_color: APP_BG,
    lang: 'es',
    icons: [
      { src: icon(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: icon(180), sizes: '180x180', type: 'image/png' },
    ],
  };
}

/** Metadatos de la página para que, al instalarla, abra directo en su sección. */
export function roleMetadata(role: Exclude<AppRole, 'clientes'>): Metadata {
  const app = ROLE_APPS[role];
  return {
    title: app.name,
    manifest: `/manifests/${role}`,
    appleWebApp: { capable: true, title: app.shortName, statusBarStyle: 'black-translucent' },
    icons: {
      icon: [{ url: `/icons/${role}?size=192`, sizes: '192x192', type: 'image/png' }],
      apple: [{ url: `/icons/${role}?size=180`, sizes: '180x180', type: 'image/png' }],
    },
  };
}
