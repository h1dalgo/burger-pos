import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import MotionProvider from '@/components/MotionProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

/* Tipografía: serif editorial (títulos, precios) + sans moderna (texto) */
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

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Burger POS - Pedidos Auto-gestionados',
  description: 'Haz tu pedido directo desde tu mesa',
  applicationName: 'Burger POS',
  appleWebApp: { capable: true, title: 'Burger POS', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#0f0d0a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`}
    >
      <body>
        {/* Tema noir en toda la app (ver globals.css) */}
        <div className="noir">
          <MotionProvider>{children}</MotionProvider>
        </div>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
