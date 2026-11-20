import type { Viewport } from 'next';
import { Fraunces, Manrope } from 'next/font/google';

/* Tipografía de la experiencia del cliente: serif editorial + sans moderna. */
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'SOFT'],
  variable: '--font-fraunces',
});
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const viewport: Viewport = {
  themeColor: '#0f0d0a',
  colorScheme: 'dark',
};

/**
 * Tema "noir" para las pantallas del cliente (menú, pedido, seguimiento):
 * fondo cálido casi negro, marfil y dorado champán, a juego con la vitrina
 * oscura de los productos en 3D. Los paneles del personal no cambian.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className={`noir ${fraunces.variable} ${manrope.variable}`}>{children}</div>;
}
