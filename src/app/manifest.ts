import type { MetadataRoute } from 'next';
import { roleManifest } from '@/lib/role-manifest';

/** App de los clientes (menú). Las del personal están en /manifests/<sección>. */
export default function manifest(): MetadataRoute.Manifest {
  return roleManifest('clientes');
}
