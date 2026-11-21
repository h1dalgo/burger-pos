import { ImageResponse } from 'next/og';
import { isAppRole } from '@/lib/app-roles';
import { BrandIcon } from '@/lib/brand-icon';

/** Ícono de la app de cada sección: /icons/meseros?size=512 */
export async function GET(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isAppRole(role)) return new Response('No existe', { status: 404 });
  const asked = Number(new URL(request.url).searchParams.get('size'));
  const size = [180, 192, 512].includes(asked) ? asked : 512;
  return new ImageResponse(<BrandIcon size={size} role={role} />, {
    width: size,
    height: size,
    headers: { 'Cache-Control': 'public, max-age=86400, immutable' },
  });
}
