'use client';

import { create } from 'zustand';
import type { PublicSettings } from '@/types';

interface BusinessState {
  settings: PublicSettings | null;
  loading: boolean;
  /** Carga los ajustes públicos (tasa, horario, promociones). Se puede llamar varias veces. */
  load: (force?: boolean) => Promise<void>;
}

let inflight: Promise<void> | null = null;
let listening = false;

/**
 * Ajustes del negocio que necesita el cliente: tasa Bs/$, si está abierto,
 * datos de Pago Móvil y promociones vigentes. Se actualiza solo cuando el
 * admin cambia algo (evento "settings:updated") y cada 5 minutos (horario).
 */
export const useBusinessStore = create<BusinessState>()((set, get) => ({
  settings: null,
  loading: false,
  load: async (force = false) => {
    if (typeof window === 'undefined') return;
    if (!listening) {
      listening = true;
      void import('@/lib/socket-client').then(({ getSocket }) => {
        getSocket().on('settings:updated', () => void get().load(true));
      });
      window.setInterval(() => void get().load(true), 5 * 60 * 1000);
    }
    if (get().settings && !force) return;
    if (inflight) return inflight;
    set({ loading: true });
    inflight = fetch('/api/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: PublicSettings | null) => {
        if (s) set({ settings: s });
      })
      .catch(() => {})
      .finally(() => {
        inflight = null;
        set({ loading: false });
      });
    return inflight;
  },
}));

/** Tasa Bs/$ vigente (0 si no está configurada). */
export const useRate = () => useBusinessStore((s) => s.settings?.exchangeRate ?? 0);
