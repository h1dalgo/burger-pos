'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionStore, useSessionHydrated } from '@/store/session-store';
import { UtensilsCrossed, Table2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import SplitText from '@/components/reactbits/SplitText';
import { cldUrl } from '@/lib/cloudinary';

export default function WelcomeForm() {
  const router = useRouter();
  const { customerName, tableNumber, setTableNumber } = useSessionStore();
  const sessionHydrated = useSessionHydrated();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [businessName, setBusinessName] = useState('BURGER POS');
  const [businessLogo, setBusinessLogo] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const [tableCount, setTableCount] = useState(0);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) setBusinessName(data.name.toUpperCase());
        if (data?.logoUrl) setBusinessLogo(data.logoUrl);
        if (typeof data?.tableCount === 'number') setTableCount(data.tableCount);
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  useEffect(() => {
    if (!sessionHydrated || tableCount < 1) return;
    const mesa = new URLSearchParams(window.location.search).get('mesa');
    if (!mesa || !/^\d{1,3}$/.test(mesa)) return;
    const num = Number(mesa);
    if (num < 1 || num > tableCount) return;
    setTableNumber(mesa);
  }, [sessionHydrated, tableCount, setTableNumber]);

  // El nombre se pide al enviar el pedido: aquí solo se entra al menú.
  useEffect(() => {
    router.prefetch('/menu');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md card px-8 py-10 relative overflow-hidden"
      >
        <div className="hairline-gold absolute top-0 inset-x-10" />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          {loadingSettings ? (
            <Skeleton className="w-24 h-24 rounded-full" />
          ) : businessLogo && !logoFailed ? (
            <img
              src={cldUrl(businessLogo, { w: 112, h: 112, fit: 'fit' })}
              alt={businessName}
              onError={() => setLogoFailed(true)}
              className="w-28 h-28 object-contain"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border border-burger/40 bg-burger/[0.07] flex items-center justify-center">
              <UtensilsCrossed className="w-10 h-10 text-burger" strokeWidth={1.25} />
            </div>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="display text-[2.6rem] leading-[1.05] text-center text-carbon mb-3"
        >
          {loadingSettings ? (
            <span className="inline-block w-40 h-9 skeleton mx-auto" />
          ) : (
            <SplitText text={businessName} tag="span" effect="blur" splitType="chars" trigger="load" delay={28} duration={0.7} ease="power3.out" textAlign="center" className="display" />
          )}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="eyebrow text-center mb-9"
        >
          Haz tu pedido directo desde tu mesa
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          {sessionHydrated && (tableNumber || customerName) && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-carbon/75">
              {customerName && <span>¡Hola de nuevo, {customerName}!</span>}
              {tableNumber && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-burger/40 bg-burger/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-burger-dark">
                  <Table2 className="h-3.5 w-3.5" />
                  Mesa {tableNumber}
                </span>
              )}
            </div>
          )}
          <Button fullWidth size="lg" onClick={() => router.push('/menu')}>
            <span className="flex items-center justify-center gap-2">
              Ver menú
              <ArrowRight className="h-5 w-5" />
            </span>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
