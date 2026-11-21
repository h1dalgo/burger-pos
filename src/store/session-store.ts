import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  customerName: string;
  tableNumber: string;
  lastOrderId: string | null;
  /** Para el recibo digital (opcionales) */
  customerEmail: string;
  customerDoc: string;
  setReceiptData: (email: string, doc: string) => void;
  setCustomerName: (name: string) => void;
  setTableNumber: (table: string) => void;
  setLastOrderId: (orderId: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      customerName: '',
      tableNumber: '',
      lastOrderId: null,
      customerEmail: '',
      customerDoc: '',
      setReceiptData: (customerEmail, customerDoc) => set({ customerEmail, customerDoc }),
      setCustomerName: (name) => set({ customerName: name }),
      setTableNumber: (table) => set({ tableNumber: table }),
      setLastOrderId: (orderId) => set({ lastOrderId: orderId }),
      reset: () => set({ customerName: '', tableNumber: '', lastOrderId: null }),
    }),
    { name: 'burger-session' }
  )
);

export function useSessionHydrated() {
  return useSyncExternalStore(
    (onChange) => useSessionStore.persist?.onFinishHydration(onChange) ?? (() => {}),
    () => useSessionStore.persist?.hasHydrated() ?? false,
    () => false
  );
}
