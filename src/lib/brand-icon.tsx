import type { AppRole } from '@/lib/app-roles';

/**
 * Ícono de las apps instalables (tema noir): fondo cálido casi negro, anillo
 * fino dorado y un símbolo por sección (cubiertos, mesero, cocina, admin).
 * Lo usan app/icon.tsx, app/apple-icon.tsx y /icons/<sección> (ImageResponse de next/og).
 */
const GLYPHS: Record<AppRole, string[]> = {
  // cubiertos cruzados (clientes)
  clientes: [
    'm16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8',
    'M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7',
    'm2.1 21.8 6.4-6.3',
    'm19 5-7 7',
  ],
  // campana de servicio (meseros)
  meseros: ['M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z', 'M20 16a8 8 0 1 0-16 0', 'M12 4v4', 'M10 4h4'],
  // gorro de chef (cocina)
  cocina: [
    'M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z',
    'M6 17h12',
  ],
  // tablero (admin)
  admin: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
};

export function BrandIcon({ size, role = 'clientes' }: { size: number; role?: AppRole }) {
  const s = Math.round(size * 0.42); // margen seguro para íconos "maskable"
  const ring = Math.round(size * 0.7);
  const stroke = Math.max(1, Math.round(size * 0.006));
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 30%, #2a2219 0%, #0f0d0a 70%)',
      }}
    >
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: ring,
          border: `${stroke}px solid rgba(216, 173, 102, 0.45)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#e2bd7e" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          {GLYPHS[role].map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </div>
    </div>
  );
}
