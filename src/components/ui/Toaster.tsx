'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1a1a2e',
          color: '#fff',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 50px -20px rgba(0,0,0,0.55)',
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 16px',
          maxWidth: '420px',
        },
        success: {
          iconTheme: { primary: '#06D6A0', secondary: '#1a1a2e' },
        },
        error: {
          iconTheme: { primary: '#EF476F', secondary: '#1a1a2e' },
        },
      }}
    />
  );
}
