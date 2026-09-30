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
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-sm w-full card p-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-mint mx-auto" strokeWidth={1.5} />
        </motion.div>

        <h1 className="text-2xl font-bold text-carbon mt-4">Pedido Registrado</h1>

        {showId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <p className="text-sm text-carbon/55">Tu número de pedido es:</p>
            <p className="display text-6xl text-burger mt-2 tabular-nums">
              #{String(orderId).padStart(4, '0')}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-5"
        >
          <div className="inline-flex items-center gap-2 bg-burger/8 text-burger text-sm font-semibold px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-burger animate-pulse" />
            Esperando confirmación de pago
          </div>
          <p className="text-sm text-carbon/60 mt-3 px-2">
            Dirígete a caja para validar tu pago y activar tu orden.
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/menu')}
          className="btn btn-outline mt-7"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Menú
        </motion.button>
      </motion.div>
    </div>
  );
}
