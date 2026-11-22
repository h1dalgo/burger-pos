import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * La mesa guardada vale por unas horas: si el cliente vuelve otro día y entra
 * sin escanear el QR, no se le manda el pedido a la mesa de la vez anterior.
 * Cada pedido renueva el plazo (una comida larga no lo vence).
 */
export const TABLE_TTL_MS = 3 * 60 * 60 * 1000;

const tableIsFresh = (setAt: number | null | undefined) => !!setAt && Date.now() - setAt < TABLE_TTL_MS;

interface SessionState {
  customerName: string;
  tableNumber: string;
  /** Cuándo se eligió la mesa (o se hizo el último pedido): para que caduque. */
  tableSetAt: number | null;
  lastOrderId: string | null;
  /** Para el recibo digital (opcionales) */
  customerEmail: string;
  customerDoc: string;
  setReceiptData: (email: string, doc: string) => void;
  setCustomerName: (name: string) => void;
  setTableNumber: (table: string) => void;
  setLastOrderId: (orderId: string) => void;
  /** Mesa vigente al momento de pedir; si ya caducó la borra y devuelve ''. */
  freshTable: () => string;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      customerName: '',
      tableNumber: '',
      tableSetAt: null,
      lastOrderId: null,
      customerEmail: '',
      customerDoc: '',
      setReceiptData: (customerEmail, customerDoc) => set({ customerEmail, customerDoc }),
      setCustomerName: (name) => set({ customerName: name }),
      setTableNumber: (table) => set({ tableNumber: table, tableSetAt: table ? Date.now() : null }),
      // pedir renueva el plazo de la mesa
      setLastOrderId: (orderId) => set((s) => ({ lastOrderId: orderId, tableSetAt: s.tableNumber ? Date.now() : s.tableSetAt })),
      freshTable: () => {
        const { tableNumber, tableSetAt } = get();
        if (tableNumber && tableIsFresh(tableSetAt)) return tableNumber;
        if (tableNumber) set({ tableNumber: '', tableSetAt: null });
        return '';
      },
      reset: () => set({ customerName: '', tableNumber: '', tableSetAt: null, lastOrderId: null }),
    }),
    {
      name: 'burger-session',
      // al abrir la app: una mesa vieja (o guardada antes de existir el plazo) se olvida;
      // el nombre sí se recuerda (solo se usa para rellenar, el cliente lo puede cambiar)
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SessionState>;
        const fresh = !!p.tableNumber && tableIsFresh(p.tableSetAt);
        return { ...current, ...p, tableNumber: fresh ? p.tableNumber! : '', tableSetAt: fresh ? p.tableSetAt! : null };
      },
    }
  )
);

export function useSessionHydrated() {
  return useSyncExternalStore(
    (onChange) => useSessionStore.persist?.onFinishHydration(onChange) ?? (() => {}),
    () => useSessionStore.persist?.hasHydrated() ?? false,
    () => false
  );
}
