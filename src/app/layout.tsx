import type { Metadata } from 'next';
import { Inter, Bebas_Neue, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import MotionProvider from '@/components/MotionProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bebas',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Burger POS - Pedidos Auto-gestionados',
  description: 'Hacé tu pedido directo desde tu mesa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${bebas.variable} ${jetbrains.variable}`}
    >
      <body>
        <MotionProvider>{children}</MotionProvider>
        <Toaster />
      </body>
    </html>
  );
}
