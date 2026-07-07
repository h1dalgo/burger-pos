'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/store/session-store';
import { UtensilsCrossed } from 'lucide-react';

export default function WelcomeForm() {
  const router = useRouter();
  const { customerName, tableNumber, setCustomerName, setTableNumber } = useSessionStore();
  const [name, setName] = useState(customerName);
  const [table, setTable] = useState(tableNumber);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !table.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setCustomerName(name.trim());
    setTableNumber(table.trim());
    router.push('/menu');
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="w-24 h-24 bg-[#E85D04] rounded-full flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-center text-[#2B2D42] mb-2"
          style={{ fontFamily: "'Bebas Neue', 'Anton', sans-serif" }}
        >
          BURGER POS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-[#E85D04] font-semibold mb-8"
        >
          Hace tu pedido directo desde tu mesa
        </motion.p>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-[#2B2D42] mb-1">Tu Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Ej: Juan"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E85D04]/20 focus:border-[#E85D04] outline-none bg-white text-[#2B2D42] placeholder:text-gray-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2B2D42] mb-1">Número de Mesa</label>
            <input
              type="text"
              value={table}
              onChange={(e) => { setTable(e.target.value); setError(''); }}
              placeholder="Ej: 5"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E85D04]/20 focus:border-[#E85D04] outline-none bg-white text-[#2B2D42] placeholder:text-gray-400 transition-colors"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[#EF476F] text-sm font-medium"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full py-3 bg-[#E85D04] text-white font-bold text-lg rounded-xl shadow-lg hover:bg-[#d55404] transition-colors"
          >
            Ver Menú
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
