'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, DollarSign, CheckCircle2, ChefHat } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSessionStore } from '@/store/session-store';
import { TextField } from '@/components/ui/TextField';

export default function LlamadoPage() {
  const tableNumberFromSession = useSessionStore((s) => s.tableNumber);
  const [typedTable, setTypedTable] = useState<string | null>(null);
  const tableNumber = typedTable ?? tableNumberFromSession ?? '';
  const [tableError, setTableError] = useState('');
  const [sending, setSending] = useState<'call' | 'bill' | null>(null);
  const [success, setSuccess] = useState<{ type: 'call' | 'bill'; table: string } | null>(null);

  const handleAction = async (type: 'call' | 'bill') => {
    if (!tableNumber.trim()) {
      setTableError('Ingresa tu número de mesa');
      return;
    }
    setTableError('');
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
      setSuccess({ type, table: tableNumber.trim() });
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      toast.error('No pudimos enviar la solicitud. Intenta de nuevo.');
    }
    setSending(null);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="card p-7 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-burger to-mustard flex items-center justify-center mx-auto shadow-lg">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <h1 className="display text-3xl text-carbon">¿NECESITAS AYUDA?</h1>
            <p className="text-carbon/55 text-sm">Selecciona tu mesa y la opción que necesitas</p>
          </div>

          <TextField
            label="Número de Mesa"
            type="number"
            inputMode="numeric"
            min={1}
            value={tableNumber}
            onChange={(e) => {
              setTypedTable(e.target.value);
              setTableError('');
            }}
            placeholder="Ej: 5"
            error={tableError}
            className="text-center text-2xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAction('call')}
              disabled={sending !== null}
              className="btn btn-primary btn-lg w-full rounded-2xl shadow-pop"
            >
              <Bell className="w-5 h-5" />
              {sending === 'call' ? 'Enviando...' : 'Llamar Mesero'}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAction('bill')}
              disabled={sending !== null}
              className="btn btn-success btn-lg w-full rounded-2xl"
            >
              <DollarSign className="w-5 h-5" />
              {sending === 'bill' ? 'Enviando...' : 'Pedir Cuenta'}
            </motion.button>
          </div>

          <p className="text-center text-carbon/40 text-xs">
            Tu solicitud será notificada al mesero asignado
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            role="status"
            className="fixed bottom-8 left-4 right-4 max-w-sm mx-auto bg-card text-white rounded-2xl p-5 shadow-pop flex items-center gap-4 border border-white/10"
          >
            <CheckCircle2 className="w-8 h-8 shrink-0 text-mint" />
            <div>
              <p className="font-bold">¡Solicitud enviada!</p>
              <p className="text-sm text-white/70">
                Mesa {success.table} — {success.type === 'call' ? 'Mesero en camino' : 'Cuenta solicitada'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
