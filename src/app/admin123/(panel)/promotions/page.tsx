'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Pencil, BadgePercent, Ticket, Clock, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEscapeClose } from '@/hooks/use-escape-close';
import { useRef } from 'react';

interface Promo {
  id: string;
  name: string;
  code: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  categoryId: string | null;
  minTotal: number;
  days: number[];
  startHour: number | null;
  endHour: number | null;
  active: boolean;
}
type Draft = Omit<Promo, 'id'> & { id?: string };

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const EMPTY: Draft = { name: '', code: null, type: 'PERCENT', value: 10, categoryId: null, minTotal: 0, days: [], startHour: null, endHour: null, active: true };

function describe(p: Promo, cats: { id: string; name: string }[]) {
  const what = p.type === 'PERCENT' ? `${p.value}% de descuento` : `$${p.value.toFixed(2)} de descuento`;
  const cat = p.categoryId ? ` en ${cats.find((c) => c.id === p.categoryId)?.name.toLowerCase() ?? 'una categoría'}` : ' en todo el pedido';
  const days = p.days.length ? ` · ${p.days.map((d) => DAYS[d]).join(', ')}` : ' · todos los días';
  const hours = p.startHour !== null && p.endHour !== null ? ` · ${p.startHour}:00 a ${p.endHour}:00` : '';
  const min = p.minTotal > 0 ? ` · desde $${p.minTotal.toFixed(2)}` : '';
  return what + cat + days + hours + min;
}

function PromoForm({ initial, cats, onClose, onSaved }: { initial: Draft; cats: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);
  const [d, setD] = useState<Draft>(initial);
  const [kind, setKind] = useState<'auto' | 'coupon'>(initial.code ? 'coupon' : 'auto');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...d, code: kind === 'coupon' ? d.code : null };
      const res = await fetch(d.id ? `/api/admin/promotions/${d.id}` : '/api/admin/promotions', {
        method: d.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error);
      toast.success('Promoción guardada');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={d.id ? 'Editar promoción' : 'Nueva promoción'}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-carbon/10 bg-card p-6 sm:rounded-[1.75rem]"
      >
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl text-carbon">{d.id ? 'Editar promoción' : 'Nueva promoción'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full border border-carbon/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
          {(
            [
              ['auto', 'Automática', 'Happy hour, día especial'],
              ['coupon', 'Cupón', 'El cliente escribe un código'],
            ] as const
          ).map(([k, t, sub]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-2xl border p-3 text-left transition-colors ${kind === k ? 'border-burger/70 bg-burger/10' : 'border-carbon/15'}`}>
              <span className="block text-sm font-semibold text-carbon">{t}</span>
              <span className="block text-[11px] text-carbon/55">{sub}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Nombre</span>
            <input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder={kind === 'coupon' ? 'Ej: Bienvenida' : 'Ej: Happy hour'} className="field" />
          </label>
          {kind === 'coupon' && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Código</span>
              <input value={d.code ?? ''} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Ej: BURGER10" className="field uppercase tracking-wider" />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Descuento</span>
              <select value={d.type} onChange={(e) => set('type', e.target.value as Draft['type'])} className="field">
                <option value="PERCENT">Porcentaje (%)</option>
                <option value="FIXED">Monto fijo ($)</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">{d.type === 'PERCENT' ? 'Porcentaje' : 'Monto ($)'}</span>
              <input type="number" min={0} step={d.type === 'PERCENT' ? 1 : 0.5} value={d.value} onChange={(e) => set('value', Number(e.target.value))} className="field" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Aplica a</span>
              <select value={d.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)} className="field">
                <option value="">Todo el pedido</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Pedido mínimo ($)</span>
              <input type="number" min={0} step={0.5} value={d.minTotal} onChange={(e) => set('minTotal', Number(e.target.value))} className="field" />
            </label>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Días (ninguno = todos)</span>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  data-tone="brand"
                  aria-pressed={d.days.includes(i)}
                  onClick={() => set('days', d.days.includes(i) ? d.days.filter((x) => x !== i) : [...d.days, i])}
                  className="chip px-3 py-1.5 text-[13px]"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Desde (hora)</span>
              <input type="number" min={0} max={24} value={d.startHour ?? ''} onChange={(e) => set('startHour', e.target.value === '' ? null : Number(e.target.value))} placeholder="Todo el día" className="field" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Hasta (hora)</span>
              <input type="number" min={0} max={24} value={d.endHour ?? ''} onChange={(e) => set('endHour', e.target.value === '' ? null : Number(e.target.value))} placeholder="Todo el día" className="field" />
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline flex-1">
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn btn-primary flex-1">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/promotions', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setPromos)
      .catch(() => toast.error('No se pudieron cargar las promociones'));
  }, []);

  useEffect(() => {
    load();
    fetch('/api/products')
      .then((r) => r.json())
      .then((d: { id: string; name: string }[]) => setCats(d.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [load]);

  const toggle = async (p: Promo) => {
    setPromos((list) => list?.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)) ?? null);
    const res = await fetch(`/api/admin/promotions/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !p.active }) });
    if (!res.ok) {
      toast.error('No se pudo cambiar');
      load();
    }
  };

  const remove = async (p: Promo) => {
    if (!window.confirm(`¿Eliminar la promoción "${p.name}"?`)) return;
    const res = await fetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Promoción eliminada');
      load();
    } else toast.error('No se pudo eliminar');
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl text-carbon leading-none">Promociones</h1>
          <p className="text-sm text-carbon/65 mt-2">Happy hour, descuentos por día o categoría y cupones. Nunca se suman dos: se aplica la que más descuenta.</p>
        </div>
        <button type="button" onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Nueva
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {!promos && [0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        {promos && promos.length === 0 && (
          <EmptyState icon={<BadgePercent className="h-7 w-7" />} title="Sin promociones" description="Crea un happy hour o un cupón para atraer más pedidos." />
        )}
        {promos?.map((p) => (
          <div key={p.id} className={`card flex items-center gap-4 p-4 ${p.active ? '' : 'opacity-60'}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-burger/40 bg-burger/10 text-burger">
              {p.code ? <Ticket className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-carbon">
                {p.name}
                {p.code && <span className="ml-2 rounded-md border border-burger/40 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-burger-dark">{p.code}</span>}
              </p>
              <p className="text-[12px] text-carbon/55">{describe(p, cats)}</p>
            </div>
            <button type="button" role="switch" aria-checked={p.active} aria-label={`${p.active ? 'Desactivar' : 'Activar'} ${p.name}`} onClick={() => toggle(p)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${p.active ? 'bg-mint' : 'bg-carbon/20'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.active ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <button type="button" onClick={() => setEditing({ ...p })} aria-label={`Editar ${p.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-carbon/15 hover:bg-carbon/[0.06]">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => remove(p)} aria-label={`Eliminar ${p.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-carbon/15 text-rose hover:bg-rose/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <PromoForm
            initial={editing}
            cats={cats}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
