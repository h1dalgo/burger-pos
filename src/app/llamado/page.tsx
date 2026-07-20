'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, DollarSign, CheckCircle2, ChefHat } from 'lucide-react';

export default function LlamadoPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [sending, setSending] = useState<'call' | 'bill' | null>(null);
  const [success, setSuccess] = useState<{ type: 'call' | 'bill'; table: string } | null>(null);

  const handleAction = async (type: 'call' | 'bill') => {
    if (!tableNumber.trim()) { alert('Ingresa tu número de mesa'); return; }
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
      alert('Error al enviar la solicitud');
    }
    setSending(null);
  };

  return (
    <div className="min-h-screen bg-[#0F0F23] flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(232,93,4,0.08) 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E85D04] to-[#FFB703] flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/20">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            ¿NECESITAS AYUDA?
          </h1>
          <p className="text-gray-500 text-sm">Selecciona tu mesa y la opción que necesitas</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2 font-medium">Número de Mesa</label>
          <input
            type="number"
            min={1}
            max={100}
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            placeholder="Ej: 5"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a2e] border border-gray-700 text-white text-center text-2xl font-bold focus:border-[#E85D04] outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div className="space-y-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleAction('call')}
            disabled={sending !== null}
            className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#E85D04] to-[#FFB703] text-white font-bold text-lg shadow-2xl shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
          >
            <Bell className="w-6 h-6" />
            {sending === 'call' ? 'Enviando...' : 'Llamar Mesero'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleAction('bill')}
            disabled={sending !== null}
            className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#06D6A0] to-emerald-600 text-white font-bold text-lg shadow-2xl shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
          >
            <DollarSign className="w-6 h-6" />
            {sending === 'bill' ? 'Enviando...' : 'Pedir Cuenta'}
          </motion.button>
        </div>

        <p className="text-center text-gray-600 text-xs">
          Tu solicitud será notificada al mesero asignado
        </p>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-8 left-4 right-4 max-w-sm mx-auto bg-gradient-to-r from-[#06D6A0] to-emerald-600 text-white rounded-2xl p-5 shadow-2xl flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <p className="font-bold">¡Solicitud enviada!</p>
              <p className="text-sm text-white/80">
                Mesa {success.table} — {success.type === 'call' ? 'Mesero en camino' : 'Cuenta solicitada'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
