'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';

interface Props {
  orderId: string;
}

export default function SuccessScreen({ orderId }: Props) {
  const router = useRouter();
  const [showId, setShowId] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowId(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-[#06D6A0] mx-auto" />
        </motion.div>

        <h1 className="text-2xl font-bold text-[#2B2D42] mt-4">
          Pedido Registrado
        </h1>

        {showId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <p className="text-sm text-[#2B2D42]/60">Tu número de pedido es:</p>
            <p className="text-5xl font-bold text-[#E85D04] mt-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              #{String(orderId).padStart(4, '0')}
            </p>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-[#E85D04] font-semibold mt-4 px-4"
        >
          Por favor, dirígete a caja para validar tu pago y activar tu orden.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/menu')}
          className="mt-8 flex items-center gap-2 mx-auto px-6 py-3 bg-[#E85D04] text-white font-semibold rounded-xl shadow-lg hover:bg-[#d55404] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Menú
        </motion.button>
      </motion.div>
    </div>
  );
}
