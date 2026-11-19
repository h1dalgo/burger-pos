/**
 * Ícono de la app (instalable): fondo rojo de fachada con los cubiertos
 * cruzados en crema y sombra mostaza, como el logo de la bienvenida.
 * Lo usan app/icon.tsx y app/apple-icon.tsx (ImageResponse de next/og).
 */
export function BrandIcon({ size }: { size: number }) {
  const s = Math.round(size * 0.5); // dejando margen seguro para íconos "maskable"
  const paths = [
    'm16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8',
    'M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7',
    'm2.1 21.8 6.4-6.3',
    'm19 5-7 7',
  ];
  const glyph = (color: string) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
  const shadow = Math.max(2, Math.round(size * 0.025));
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d9261c' }}>
      <div style={{ position: 'relative', display: 'flex', width: s, height: s }}>
        <div style={{ position: 'absolute', left: shadow, top: shadow, display: 'flex' }}>{glyph('#ffc72c')}</div>
        <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex' }}>{glyph('#fdf6e3')}</div>
      </div>
    </div>
  );
}
