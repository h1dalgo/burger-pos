'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Bell, DollarSign, Table2, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSessionStore } from '@/store/session-store';
import { Button } from '@/components/ui/Button';

interface Props {
  onClose: () => void;
  onPickTable?: () => void;
}

export default function ServiceSheet({ onClose, onPickTable }: Props) {
  const tableNumber = useSessionStore((s) => s.tableNumber);
  const [sending, setSending] = useState<'call' | 'bill' | null>(null);
  const hasTable = !!tableNumber.trim();

  const handleAction = async (type: 'call' | 'bill') => {
    if (!hasTable || sending) return;
    setSending(type);
    try {
      const res = await fetch('/api/table-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tableNumber.trim(),
          type: type === 'call' ? 'CALL_WAITER' : 'REQUEST_BILL',
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        type === 'call'
          ? `Mesa ${tableNumber} — mesero en camino`
          : `Mesa ${tableNumber} — cuenta solicitada`
      );
      onClose();
    } catch {
      toast.error('No pudimos enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSending(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Llamar al mesero"
        className="absolute bottom-0 left-0 right-0 sm:max-w-lg sm:mx-auto bg-cream rounded-t-3xl overflow-hidden"
      >
        <div className="px-6 pt-5 pb-4 border-b-2 border-carbon flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="display text-2xl text-carbon sign-yellow">¿Necesitas ayuda?</h2>
            <p className="text-xs text-carbon/50 mt-1 flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5 shrink-0" />
              {hasTable ? `Estás en la mesa ${tableNumber}` : 'Elige tu mesa para continuar'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 shrink-0 rounded-full bg-card border-2 border-carbon flex items-center justify-center hover:bg-mustard transition-colors"
          >
            <X className="w-4.5 h-4.5 text-carbon" />
          </button>
        </div>

        <div className="p-6 space-y-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          {!hasTable ? (
            <>
              <p className="text-sm text-carbon/70">
                Antes de llamar al mesero, dinos en qué mesa estás desde el chip del menú.
              </p>
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  onClose();
                  onPickTable?.();
                }}
              >
                <Table2 className="w-5 h-5" />
                Elegir mi mesa
              </Button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={sending !== null}
                onClick={() => handleAction('call')}
                className="btn btn-primary btn-lg w-full rounded-2xl shadow-pop disabled:opacity-60"
              >
                <Bell className="w-5 h-5" />
                {sending === 'call' ? 'Enviando...' : 'Llamar Mesero'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={sending !== null}
                onClick={() => handleAction('bill')}
                className="btn btn-success btn-lg w-full rounded-2xl disabled:opacity-60"
              >
                <DollarSign className="w-5 h-5" />
                {sending === 'bill' ? 'Enviando...' : 'Pedir Cuenta'}
              </motion.button>
              <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-carbon/40 text-xs">
                <Users className="w-3.5 h-3.5" />
                Tu solicitud será notificada al mesero asignado
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
