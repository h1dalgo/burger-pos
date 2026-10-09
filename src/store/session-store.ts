import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  customerName: string;
  tableNumber: string;
  lastOrderId: string | null;
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
      setCustomerName: (name) => set({ customerName: name }),
      setTableNumber: (table) => set({ tableNumber: table }),
      setLastOrderId: (orderId) => set({ lastOrderId: orderId }),
      reset: () => set({ customerName: '', tableNumber: '', lastOrderId: null }),
    }),
    { name: 'burger-session' }
  )
);
