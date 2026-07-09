'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminStore((s) => s.login);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(pin);
    if (ok) router.push('/admin123');
    else setError('PIN incorrecto');
  };

  return (
    <div className="min-h-screen bg-[#0F0F23] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E85D04] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>ADMIN</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa el PIN de administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="PIN"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a2e] border border-gray-700 text-white text-center text-2xl tracking-widest focus:border-[#E85D04] outline-none"
            maxLength={10}
            autoFocus
          />
          {error && <p className="text-[#EF476F] text-sm text-center">{error}</p>}
          <button type="submit" className="w-full py-3 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#d55404] transition-colors">
            Ingresar
          </button>
        </form>
      </motion.div>
    </div>
  );
}
