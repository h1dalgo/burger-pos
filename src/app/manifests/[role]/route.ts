import { NextResponse } from 'next/server';
import { isAppRole } from '@/lib/app-roles';
import { roleManifest } from '@/lib/role-manifest';

/** Manifest de la app instalable de cada sección: /manifests/meseros, /manifests/cocina, /manifests/admin. */
export async function GET(_request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isAppRole(role)) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  return new NextResponse(JSON.stringify(roleManifest(role)), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}
