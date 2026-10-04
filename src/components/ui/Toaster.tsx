'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1a1712',
          color: '#fdf6e3',
          borderRadius: '12px',
          border: '2px solid #1a1712',
          boxShadow: '4px 4px 0 rgb(26 23 18 / 0.35)',
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 16px',
          maxWidth: '420px',
        },
        success: {
          iconTheme: { primary: '#ffc72c', secondary: '#1a1712' },
        },
        error: {
          iconTheme: { primary: '#ff7a7a', secondary: '#1a1712' },
        },
      }}
    />
  );
}
