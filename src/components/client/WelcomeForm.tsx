'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionStore, useSessionHydrated } from '@/store/session-store';
import { UtensilsCrossed } from 'lucide-react';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function WelcomeForm() {
  const router = useRouter();
  const { customerName, setCustomerName, setTableNumber } = useSessionStore();
  const sessionHydrated = useSessionHydrated();
  const [name, setName] = useState(customerName);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
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

  useEffect(() => {
    if (!sessionHydrated) return;
    const t = setTimeout(() => setName((n) => n || customerName), 0);
    return () => clearTimeout(t);
  }, [sessionHydrated, customerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Escribe tu nombre');
      return;
    }
    if (/\d/.test(name)) {
      setNameError('El nombre no puede contener números');
      return;
    }
    setCustomerName(name.trim());
    router.push('/menu');
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md card p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1.5 bg-burger" />
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
              src={businessLogo}
              alt={businessName}
              onError={() => setLogoFailed(true)}
              className="w-28 h-28 object-contain"
            />
          ) : (
            <div className="w-24 h-24 bg-burger border-2 border-carbon rounded-full flex items-center justify-center shadow-card">
              <UtensilsCrossed className="w-12 h-12 text-cream" />
            </div>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="display text-4xl text-center text-carbon sign-yellow mb-2"
        >
          {loadingSettings ? <span className="inline-block w-40 h-9 skeleton mx-auto" /> : businessName}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-burger font-semibold mb-8"
        >
          Hace tu pedido directo desde tu mesa
        </motion.p>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          <TextField
            label="Tu Nombre"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value.replace(/\d/g, ''));
              setNameError('');
              setError('');
            }}
            placeholder="Ej: Juan"
            error={nameError || (error && !name.trim() ? error : undefined)}
          />

          <Button type="submit" fullWidth size="lg">
            Ver Menú
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
