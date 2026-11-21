'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="top-center"
      // debajo del notch / Dynamic Island cuando la app está instalada
      containerStyle={{ top: 'calc(16px + env(safe-area-inset-top, 0px))' }}
      toastOptions={{
        duration: 3500,
        style: {
          background: 'rgba(23, 19, 15, 0.94)',
          color: '#f2e9da',
          borderRadius: '14px',
          border: '1px solid rgba(242, 233, 218, 0.12)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 18px 40px -18px rgba(0, 0, 0, 0.7)',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '-0.005em',
          padding: '12px 16px',
          maxWidth: '420px',
        },
        success: {
          iconTheme: { primary: '#d8ad66', secondary: '#17130f' },
        },
        error: {
          iconTheme: { primary: '#e8758b', secondary: '#17130f' },
        },
      }}
    />
  );
}
