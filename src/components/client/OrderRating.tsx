'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart } from 'lucide-react';

const LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!'];

/** Calificar el pedido (1 a 5 estrellas + comentario opcional). */
export default function OrderRating({ orderId, initial }: { orderId: string; initial?: number | null }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(!!initial);
  const [error, setError] = useState('');
  const shown = hover || rating;

  const send = async () => {
    if (!rating) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok && res.status !== 409) throw new Error(j?.error);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-carbon/10 px-4 py-3 text-sm text-carbon/70">
        <Heart className="h-4 w-4 fill-current text-burger" />
        ¡Gracias por tu opinión!
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-carbon/10 px-4 py-4 text-center">
      <p className="text-sm font-semibold text-carbon">¿Qué tal estuvo todo?</p>
      <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} de 5: ${LABELS[n]}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="p-1 transition-transform active:scale-90"
          >
            <Star className={`h-8 w-8 transition-colors ${n <= shown ? 'fill-burger text-burger' : 'text-carbon/25'}`} strokeWidth={1.4} />
          </button>
        ))}
      </div>
      <p className="h-4 text-[12px] text-carbon/55" aria-live="polite">
        {LABELS[shown]}
      </p>
      <AnimatePresence initial={false}>
        {rating > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 300))} placeholder="Cuéntanos algo (opcional)" rows={2} className="field field-textarea mt-3 min-h-0 text-sm" />
            {error && (
              <p className="mt-1 text-[12px] text-rose" role="alert">
                {error}
              </p>
            )}
            <button type="button" onClick={send} disabled={sending} className="btn btn-primary btn-sm mt-3 w-full">
              {sending ? 'Enviando…' : 'Enviar opinión'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
