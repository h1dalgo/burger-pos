'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CheckCircle,
  Flame,
  PartyPopper,
  Wallet,
  Loader2,
  Bell,
  BellRing,
  ChevronDown,
  Plus,
  Clock,
  WifiOff,
  ConciergeBell,
  StickyNote,
} from 'lucide-react';
import type { Order } from '@/types';
import { formatPrice } from '@/lib/utils';
import { loadPreview, type OrderPreview } from '@/lib/order-preview';
import ServiceSheet from './ServiceSheet';
import { SHOWCASE_BG } from './ProductVisual3D';

const Burger3D = dynamic(() => import('./burger3d/Burger3D'), { ssr: false });
const Item3D = dynamic(() => import('./burger3d/Item3D'), { ssr: false });

interface Props {
  orderId: string;
}

const STAGES = [
  {
    key: 'WAITING_PAYMENT',
    title: 'Pedido registrado',
    label: 'Esperando confirmación de pago',
    desc: 'Dirígete a caja para validar tu pago y activar tu orden.',
    icon: Wallet,
  },
  {
    key: 'PENDING',
    title: 'Pedido recibido',
    label: 'En cola',
    desc: 'Ya confirmamos tu pedido, lo tomamos enseguida.',
    icon: CheckCircle,
  },
  {
    key: 'IN_PREPARATION',
    title: 'En cocina',
    label: 'En preparación',
    desc: '¡Ya lo estamos cocinando! Pronto estará listo.',
    icon: Flame,
  },
  {
    key: 'READY',
    title: '¡Listo!',
    label: 'Listo para servir',
    desc: 'Pasa a buscar tu pedido o te lo llevamos a la mesa.',
    icon: PartyPopper,
  },
  {
    key: 'DELIVERED',
    title: 'Entregado',
    label: '¡Buen provecho!',
    desc: 'Disfruta tu pedido. ¡Gracias por elegirnos!',
    icon: CheckCircle,
  },
];

const PAYMENT_LABEL: Record<string, string> = { CASH: 'Efectivo', MOBILE_PAYMENT: 'Pago móvil', CARD: 'Tarjeta' };

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

/** Minutos estimados hasta que esté listo (aproximado: por etapa y cantidad de productos). */
function etaMinutes(order: Order | null, status: string | null, now: number): number | null {
  if (!order || !status) return null;
  const qty = order.items.reduce((n, i) => n + i.quantity, 0);
  const prep = Math.min(22, 6 + qty * 2);
  const since = Math.max(0, (now - new Date(order.updatedAt).getTime()) / 60000);
  if (status === 'PENDING') return Math.max(prep, Math.round(3 + prep - since));
  if (status === 'IN_PREPARATION') return Math.max(1, Math.round(prep - since));
  return null;
}

const notifSubscribe = () => () => {};
const notifSnapshot = () => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
const notifServerSnapshot = () => 'unsupported';
// true solo en el navegador (ya montado): evita diferencias con el HTML del servidor
const mountedSnapshot = () => true;
const serverMountedSnapshot = () => false;

export default function SuccessScreen({ orderId }: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const statusRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [showReady, setShowReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [summaryOpen, setSummaryOpen] = useState<boolean | null>(null); // null = automático
  const [serviceOpen, setServiceOpen] = useState(false);
  const [, setPermTick] = useState(0);
  const notifPerm = useSyncExternalStore(notifSubscribe, notifSnapshot, notifServerSnapshot);
  const mounted = useSyncExternalStore(notifSubscribe, mountedSnapshot, serverMountedSnapshot);
  const displayNum = String(orderId).padStart(4, '0');
  const seenKey = `burger-pos:ready-seen:${orderId}`;

  /** Aviso fuera de la app (si el cliente dio permiso y no está mirando la pestaña). */
  const notifyReady = useCallback(async () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
    const title = `¡Tu pedido #${displayNum} está listo!`;
    const opts = { body: 'Muestra tu número en el mostrador.', tag: `order-${orderId}`, icon: '/icon', data: { url: `/success?orderId=${orderId}` } };
    try {
      // En Android (y en iPhone con la app instalada) los avisos deben salir del service worker
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (reg) await reg.showNotification(title, opts);
      else new Notification(title, opts);
    } catch {
      /* el navegador no permite avisos aquí: queda el aviso en pantalla, el sonido y la vibración */
    }
  }, [displayNum, orderId]);

  const applyStatus = useCallback(
    (next: string, initial = false) => {
      const prev = statusRef.current;
      statusRef.current = next;
      setStatus(next);
      if (next !== 'READY' || prev === 'READY') return;
      let seen = false;
      try {
        seen = sessionStorage.getItem(seenKey) === '1';
      } catch {}
      if (!seen) setShowReady(true);
      if (!initial) {
        playReadyChime();
        if (typeof navigator !== 'undefined') navigator.vibrate?.([200, 100, 200, 100, 400]);
        void notifyReady();
      }
    },
    [seenKey, notifyReady]
  );

  const refetch = useCallback(async () => {
    const displayId = Number(orderId);
    if (!Number.isInteger(displayId) || displayId <= 0) return;
    try {
      const res = await fetch(`/api/orders?displayId=${displayId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Order | null;
      if (!data?.status) return;
      setOrder(data);
      applyStatus(data.status, statusRef.current === null);
    } catch {
      /* sin conexión: se reintenta en el próximo ciclo */
    }
  }, [orderId, applyStatus]);

  // Tiempo real (socket) + respaldo: si la conexión se cae, se consulta el estado cada pocos segundos.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const setup = async () => {
      const { getSocket, joinRoom } = await import('@/lib/socket-client');
      joinRoom('clients');
      await refetch();
      if (cancelled) return;
      const socket = getSocket();
      setConnected(socket.connected);
      const onUpdated = (o: Order) => {
        if (o && String(o.displayId) === String(orderId)) {
          setOrder((prev) => (prev ? { ...prev, ...o, items: o.items?.length ? o.items : prev.items } : o));
          applyStatus(o.status);
        }
      };
      const onConnect = () => {
        setConnected(true);
        void refetch(); // por si cambió algo mientras estaba desconectado
      };
      const onDisconnect = () => setConnected(false);
      socket.on('order:updated', onUpdated);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      poll = setInterval(() => {
        if (!socket.connected) void refetch();
      }, 8000);
      cleanup = () => {
        socket.off('order:updated', onUpdated);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    };
    void setup();

    const onVisible = () => {
      if (!document.hidden) void refetch(); // al volver al teléfono, ponerse al día
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      cleanup?.();
      if (poll) clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [orderId, refetch, applyStatus]);

  // Reloj para el tiempo estimado
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Título de la pestaña parpadeando mientras el aviso de "listo" está abierto
  useEffect(() => {
    if (!showReady) return;
    const original = document.title;
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? `🔔 ¡Pedido #${displayNum} listo!` : original;
    }, 1000);
    return () => {
      clearInterval(id);
      document.title = original;
    };
  }, [showReady, displayNum]);

  const dismissReady = () => {
    setShowReady(false);
    try {
      sessionStorage.setItem(seenKey, '1');
    } catch {}
  };

  const askNotifications = async () => {
    try {
      await Notification.requestPermission();
    } catch {}
    setPermTick((t) => t + 1);
  };

  // la vista previa vive en el navegador (sessionStorage): solo después de montar
  const preview = useMemo<OrderPreview | null>(() => (mounted ? loadPreview(orderId, order) : null), [mounted, orderId, order]);
  const stageIndex = status ? Math.max(0, STAGES.findIndex((s) => s.key === status)) : -1;
  const current = stageIndex >= 0 ? STAGES[stageIndex] : null;
  const isReady = status === 'READY';
  const isDone = status === 'DELIVERED';
  const eta = etaMinutes(order, status, now);
  const itemsCount = order?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
  const showSummary = summaryOpen ?? status === 'WAITING_PAYMENT';

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-sm w-full card p-5 relative overflow-hidden"
      >
        <div className={`absolute top-0 inset-x-8 h-px ${isReady || isDone ? 'bg-gradient-to-r from-transparent via-mint to-transparent' : 'hairline-gold'}`} />

        {/* Producto en 3D según la etapa */}
        {preview && (
          <div className="mt-1">
            <OrderHero3D preview={preview} status={status} />
          </div>
        )}

        <div className="text-center">
          <motion.h1
            key={current?.title || 'loading'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`display text-3xl mt-4 ${isReady ? 'text-mint-ink sign' : 'text-carbon sign-yellow'}`}
          >
            {current?.title || 'Pedido registrado'}
          </motion.h1>
          {/* anuncia cada cambio de etapa a lectores de pantalla */}
          <p className="sr-only" aria-live="polite" role="status">
            {current ? `Pedido ${displayNum}: ${current.title}. ${current.desc}` : ''}
          </p>
          <p className="text-sm text-carbon/65 mt-2">Tu número de pedido es</p>
          <p className="display text-5xl text-burger sign mt-0.5 tabular-nums">#{displayNum}</p>

          {eta !== null && (
            <motion.p
              key={eta}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-carbon bg-mustard px-3 py-1 text-sm font-bold text-carbon"
            >
              <Clock className="h-4 w-4" />
              {eta <= 1 ? '¡Ya casi!' : `Listo en ~${eta} min`}
            </motion.p>
          )}
        </div>

        <AnimatePresence>
          {!connected && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-carbon/5 px-3 py-2 text-xs font-semibold text-carbon/70"
              role="status"
            >
              <WifiOff className="h-3.5 w-3.5" />
              Reconectando… revisamos tu pedido cada pocos segundos
            </motion.p>
          )}
        </AnimatePresence>

        {/* Línea de tiempo */}
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
                    ? 'border-burger/40 bg-burger/[0.07]'
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
                  <p className={`text-xs font-bold ${active ? 'text-carbon' : 'text-carbon/70'}`}>{stage.label}</p>
                  {active && <p className="text-[11px] text-carbon/70 leading-snug">{stage.desc}</p>}
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

        {/* Pedir aviso fuera de la app */}
        {notifPerm === 'default' && !isReady && !isDone && (
          <button
            onClick={askNotifications}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-carbon/15 px-3 py-2.5 text-sm font-semibold text-carbon transition-colors hover:border-burger/50"
          >
            <Bell className="h-4 w-4" />
            Avísame cuando esté listo
          </button>
        )}
        {notifPerm === 'granted' && !isReady && !isDone && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-mint-ink">
            <BellRing className="h-3.5 w-3.5" />
            Te avisaremos aunque cambies de app
          </p>
        )}

        {/* Resumen del pedido */}
        {order && (
          <div className="mt-4 rounded-xl border-2 border-carbon/15 bg-card">
            <button
              onClick={() => setSummaryOpen(!showSummary)}
              aria-expanded={showSummary}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
            >
              <span className="text-sm font-bold text-carbon">
                Tu pedido · {itemsCount} {itemsCount === 1 ? 'producto' : 'productos'}
              </span>
              <span className="flex items-center gap-2 text-sm font-bold tabular-nums text-carbon">
                {formatPrice(Number(order.totalAmount))}
                <ChevronDown className={`h-4 w-4 transition-transform ${showSummary ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {showSummary && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <ul className="space-y-2 border-t border-carbon/10 px-3.5 py-3">
                    {order.items.map((it) => (
                      <li key={it.id} className="text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="font-semibold text-carbon">
                            {it.quantity}× {it.productName}
                          </span>
                          <span className="tabular-nums text-carbon/80">{formatPrice(Number(it.subtotal))}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {it.variation && <SummaryTag tone="brand">{it.variation.variationName}</SummaryTag>}
                          {it.selections.map((s, i) => (
                            <SummaryTag key={`s${i}`} tone="neutral">
                              {s.selectedOptionName}
                            </SummaryTag>
                          ))}
                          {it.removedIngredients.map((r, i) => (
                            <SummaryTag key={`r${i}`} tone="rose">
                              {r.ingredientName}
                            </SummaryTag>
                          ))}
                          {it.addedExtras.map((e, i) => (
                            <SummaryTag key={`e${i}`} tone="mint">
                              +{e.extraName}
                            </SummaryTag>
                          ))}
                        </div>
                        {it.note && (
                          <p className="mt-0.5 flex items-start gap-1 text-xs italic text-status-preparing">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                            {it.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-1 border-t border-carbon/10 px-3.5 py-2.5 text-xs text-carbon/75">
                    <p className="flex justify-between">
                      <span>Pago</span>
                      <span className="font-semibold text-carbon">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
                    </p>
                    {Number(order.tip ?? 0) > 0 && (
                      <p className="flex justify-between">
                        <span>Propina</span>
                        <span className="font-semibold tabular-nums text-carbon">{formatPrice(Number(order.tip))}</span>
                      </p>
                    )}
                    {order.tableNumber && (
                      <p className="flex justify-between">
                        <span>Mesa</span>
                        <span className="font-semibold text-carbon">{order.tableNumber}</span>
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Acciones */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/menu')} className="btn btn-outline">
            <Plus className="w-4 h-4" />
            Pedir algo más
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setServiceOpen(true)} className="btn btn-outline">
            <ConciergeBell className="w-4 h-4" />
            Mesero o cuenta
          </motion.button>
        </div>
      </motion.div>

      {/* Aviso de "¡Listo!" a pantalla completa */}
      <AnimatePresence>
        {showReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0a08] bg-[radial-gradient(600px_420px_at_50%_35%,rgb(92_185_135/0.22),transparent_70%)] p-6 text-[#f2e9da]"
            role="alertdialog"
            aria-modal="true"
            aria-label="Tu pedido está listo"
          >
            <motion.div
              initial={{ scale: 0.85, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="w-full max-w-sm text-center"
            >
              <motion.div
                animate={reduced ? undefined : { rotate: [0, -14, 14, -8, 8, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.2 }}
                className="inline-block"
              >
                <BellRing className="h-14 w-14 text-mint-ink" strokeWidth={1.4} />
              </motion.div>
              <p className="display text-4xl mt-5 leading-tight">¡Tu pedido está listo!</p>
              <p className="eyebrow mt-8 !text-mint-ink">Pedido</p>
              <p className="display text-7xl tabular-nums">#{displayNum}</p>
              <p className="mt-4 text-sm leading-relaxed text-[#f2e9da]/70">
                Muestra este número en el mostrador o espéralo en tu mesa{order?.tableNumber ? ` ${order.tableNumber}` : ''}.
              </p>
              <button onClick={dismissReady} className="btn btn-solid btn-lg mt-8 w-full">
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serviceOpen && <ServiceSheet onClose={() => setServiceOpen(false)} onPickTable={() => router.push('/menu')} />}
      </AnimatePresence>
    </div>
  );
}

function SummaryTag({ tone, children }: { tone: 'brand' | 'rose' | 'mint' | 'neutral'; children: React.ReactNode }) {
  const tones = {
    brand: 'border-burger/40 bg-burger/10 text-burger',
    rose: 'border-rose/40 bg-rose/10 text-rose line-through',
    mint: 'border-mint/40 bg-mint/10 text-mint-ink',
    neutral: 'border-carbon/20 bg-carbon/5 text-carbon/75',
  };
  return <span className={`inline-block rounded-full border px-1.5 py-px text-[10px] font-semibold ${tones[tone]}`}>{children}</span>;
}

/**
 * El producto del pedido en 3D. En cocina, la hamburguesa se "arma" capa por
 * capa en bucle; cuando está lista, salta de alegría.
 */
function OrderHero3D({ preview, status }: { preview: OrderPreview; status: string | null }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const all = preview.ingredients;
  const cooking = preview.variant === 'burger' && status === 'IN_PREPARATION' && !reduced && all.length > 0;

  useEffect(() => {
    if (!cooking) return;
    const id = setInterval(() => setStep((s) => s + 1), 950);
    return () => clearInterval(id);
  }, [cooking]);

  const ingredients = useMemo(() => (cooking ? all.slice(0, step % (all.length + 2)) : all), [cooking, all, step]);
  const isReady = status === 'READY';
  const H = 210;

  return (
    <motion.div
      animate={isReady && !reduced ? { y: [0, -12, 0], scale: [1, 1.05, 1] } : { y: 0, scale: 1 }}
      transition={isReady && !reduced ? { duration: 0.8, repeat: Infinity, repeatDelay: 1.4, ease: 'easeOut' } : { duration: 0.3 }}
      className={`relative overflow-hidden rounded-2xl border-2 border-carbon shadow-card ${isReady ? 'ring-4 ring-mint' : ''}`}
      style={{ height: H, background: SHOWCASE_BG }}
      aria-hidden="true"
    >
      {preview.variant === 'burger' ? (
        <Burger3D ingredients={ingredients} height={H} theme="dark" />
      ) : (
        <Item3D variant={preview.variant} name={preview.name} description={preview.description} choices={preview.choices} height={H} theme="dark" />
      )}
    </motion.div>
  );
}
