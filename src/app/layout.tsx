import type { Metadata, Viewport } from 'next';
import { Archivo, Alfa_Slab_One, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import MotionProvider from '@/components/MotionProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
});

const alfa = Alfa_Slab_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alfa',
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
  appleWebApp: { capable: true, title: 'Burger POS', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#d9261c',
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
      className={`${archivo.variable} ${alfa.variable} ${jetbrains.variable}`}
    >
      <body>
        <MotionProvider>{children}</MotionProvider>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
