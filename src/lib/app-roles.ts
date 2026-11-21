/**
 * Apps instalables: cada sección se instala como su propia app en el teléfono
 * (nombre, ícono y página de inicio propios). Desde el celular, abrir la
 * sección y usar "Agregar a pantalla de inicio".
 */
export type AppRole = 'clientes' | 'meseros' | 'cocina' | 'admin';

export interface RoleApp {
  /** Nombre completo (Android) */
  name: string;
  /** Nombre bajo el ícono */
  shortName: string;
  description: string;
  startUrl: string;
  orientation: 'portrait' | 'any';
}

export const ROLE_APPS: Record<AppRole, RoleApp> = {
  clientes: {
    name: 'Burger POS — Pedidos desde tu mesa',
    shortName: 'Burger POS',
    description: 'Haz tu pedido directo desde tu mesa',
    startUrl: '/menu',
    orientation: 'portrait',
  },
  meseros: {
    name: 'Burger POS · Meseros',
    shortName: 'Meseros',
    description: 'Mesas, pedidos y llamados del salón',
    startUrl: '/meseros',
    orientation: 'portrait',
  },
  cocina: {
    name: 'Burger POS · Cocina',
    shortName: 'Cocina',
    description: 'Comandas en vivo, caja y stock',
    startUrl: '/kitchen',
    orientation: 'any',
  },
  admin: {
    name: 'Burger POS · Administración',
    shortName: 'Admin',
    description: 'Ventas, productos, inventario y configuración',
    startUrl: '/admin123',
    orientation: 'any',
  },
};

export const isAppRole = (r: string): r is AppRole => r in ROLE_APPS;

/** Colores de la app instalada (pantalla de carga y barra), a juego con el tema noir. */
export const APP_BG = '#0f0d0a';
