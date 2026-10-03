'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Loader2 } from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminStore((s) => s.login);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const ok = await login(pin);
      if (ok) router.push('/admin123');
      else setError('PIN incorrecto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-night flex items-center justify-center p-4"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(232,93,4,0.08) 0%, transparent 60%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-burger to-mustard rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-pop">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="display text-4xl text-gradient-brand">ADMIN</h1>
          <p className="text-white/45 text-sm mt-1">Ingresa el PIN de administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="card card-dark p-6 space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            placeholder="PIN"
            aria-label="PIN de administrador"
            aria-invalid={error ? true : undefined}
            className="field field-dark w-full text-center text-2xl tracking-widest"
            maxLength={10}
            autoFocus
          />
          {error && (
            <p className="text-rose text-sm text-center font-semibold" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full h-12"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
