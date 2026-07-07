import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  customerName: string;
  tableNumber: string;
  setCustomerName: (name: string) => void;
  setTableNumber: (table: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      customerName: '',
      tableNumber: '',
      setCustomerName: (name) => set({ customerName: name }),
      setTableNumber: (table) => set({ tableNumber: table }),
      reset: () => set({ customerName: '', tableNumber: '' }),
    }),
    { name: 'burger-session' }
  )
);
