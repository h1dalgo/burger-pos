import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
  isAuth: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAuth: false,

      login: async (pin: string) => {
        try {
          const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin }),
          });
          if (res.ok) {
            set({ isAuth: true });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      logout: () => set({ isAuth: false }),

      checkAuth: () => get().isAuth,
    }),
    { name: 'burger-admin' }
  )
);
