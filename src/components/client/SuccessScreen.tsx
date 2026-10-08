'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, Flame, PartyPopper, Wallet, Loader2 } from 'lucide-react';

interface Props {
  orderId: string;
}

const STAGES = [
  {
    key: 'WAITING_PAYMENT',
    title: 'Pedido Registrado',
    label: 'Esperando confirmación de pago',
    desc: 'Dirígete a caja para validar tu pago y activar tu orden.',
    icon: Wallet,
    tone: 'mustard',
  },
  {
    key: 'PENDING',
    title: 'Pedido Recibido',
    label: 'En cola',
    desc: 'Ya confirmamos tu pedido, lo tomamos enseguida.',
    icon: CheckCircle,
    tone: 'mustard',
  },
  {
    key: 'IN_PREPARATION',
    title: 'En Cocina',
    label: 'En preparación',
    desc: '¡Ya lo estamos cocinando! Pronto estará listo.',
    icon: Flame,
    tone: 'burger',
  },
  {
    key: 'READY',
    title: '¡Listo!',
    label: 'Listo para servir',
    desc: 'Pasá a buscar tu pedido o te lo llevamos a la mesa.',
    icon: PartyPopper,
    tone: 'mint',
  },
  {
    key: 'DELIVERED',
    title: 'Entregado',
    label: '¡Buen provecho!',
    desc: 'Disfrutá tu pedido. ¡Gracias por elegirnos!',
    icon: CheckCircle,
    tone: 'mint',
  },
];

function playReadyChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    const notes = [880, 1100, 1320, 1760];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.35);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

export default function SuccessScreen({ orderId }: Props) {
  const router = useRouter();
  const [showId, setShowId] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const statusRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowId(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyStatus = (next: string) => {
      if (statusRef.current === 'READY' && next !== 'READY') {
        statusRef.current = next;
        setStatus(next);
        return;
      }
      if (next === 'READY' && statusRef.current !== 'READY') {
        playReadyChime();
      }
      statusRef.current = next;
      setStatus(next);
    };

    const setup = async () => {
      const { getSocket, joinRoom } = await import('@/lib/socket-client');
      joinRoom('clients');

      const displayId = Number(orderId);
      if (Number.isInteger(displayId) && displayId > 0) {
        try {
          const res = await fetch(`/api/orders?displayId=${displayId}`);
          if (res.ok) {
            const order = await res.json();
            if (!cancelled && order?.status && statusRef.current === null) {
              statusRef.current = order.status;
              setStatus(order.status);
            }
          }
        } catch {}
      }

      if (cancelled) return;
      const socket = getSocket();
      const onUpdated = (order: { displayId: number; status: string }) => {
        if (order && String(order.displayId) === String(orderId)) {
          applyStatus(order.status);
        }
      };
      socket.on('order:updated', onUpdated);
      cleanup = () => socket.off('order:updated', onUpdated);
    };

    let cleanup: (() => void) | null = null;
    setup();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [orderId]);

  const stageIndex = status ? Math.max(0, STAGES.findIndex((s) => s.key === status)) : -1;
  const current = stageIndex >= 0 ? STAGES[stageIndex] : null;
  const isReady = status === 'READY';
  const isDone = status === 'DELIVERED';
  const TitleIcon = current?.icon || CheckCircle;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-sm w-full card p-8 relative overflow-hidden"
      >
        <div className={`absolute top-0 inset-x-0 h-1.5 ${isReady || isDone ? 'bg-mint' : 'bg-mustard'}`} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          {isReady ? (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            >
              <PartyPopper className="w-20 h-20 text-mint mx-auto" strokeWidth={1.5} />
            </motion.div>
          ) : (
            <TitleIcon
              className={`w-20 h-20 mx-auto ${isDone ? 'text-mint' : 'text-burger'}`}
              strokeWidth={1.5}
            />
          )}
        </motion.div>

        <motion.h1
          key={current?.title || 'loading'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`display text-3xl mt-4 ${isReady ? 'text-mint-ink sign' : 'text-carbon sign-yellow'}`}
        >
          {current?.title || 'Pedido Registrado'}
        </motion.h1>

        {showId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <p className="text-sm text-carbon/55">Tu número de pedido es:</p>
            <p className="display text-5xl text-burger sign mt-1 tabular-nums">
              #{String(orderId).padStart(4, '0')}
            </p>
          </motion.div>
        )}

        <div className="mt-5 space-y-2 text-left">
          {STAGES.map((stage, i) => {
            const done = stageIndex >= 0 && i < stageIndex;
            const active = stageIndex === i;
            const StageIcon = stage.icon;
            return (
              <div
                key={stage.key}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 border-2 transition-colors ${
                  active
                    ? 'border-carbon bg-mustard shadow-card'
                    : done
                      ? 'border-mint/40 bg-mint/10'
                      : 'border-carbon/10 bg-carbon/[0.02] opacity-55'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                    active
                      ? 'bg-mint border-carbon text-cream'
                      : done
                        ? 'bg-mint/20 border-mint/50 text-mint-ink'
                        : 'bg-card border-carbon/20 text-carbon/50'
                  }`}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : active && status === null ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <StageIcon className="w-4 h-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${active ? 'text-carbon' : 'text-carbon/70'}`}>
                    {stage.label}
                  </p>
                  {active && <p className="text-[11px] text-carbon/65 leading-snug">{stage.desc}</p>}
                </div>
                {active && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className="ml-auto w-2 h-2 rounded-full bg-burger shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/menu')}
          className="btn btn-outline mt-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Menú
        </motion.button>
      </motion.div>
    </div>
  );
}
