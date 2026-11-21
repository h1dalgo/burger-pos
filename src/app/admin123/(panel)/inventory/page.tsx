'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Boxes, AlertTriangle, X, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEscapeClose } from '@/hooks/use-escape-close';

interface Usage {
  productId: string;
  productName?: string;
  amount: number;
}
interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowAt: number;
  usages: Usage[];
}
type Draft = Omit<Item, 'id'> & { id?: string };
interface Cat {
  id: string;
  name: string;
  products: { id: string; name: string }[];
}

const EMPTY: Draft = { name: '', quantity: 0, unit: 'u', lowAt: 5, usages: [] };
const fmt = (n: number) => n.toLocaleString('es-VE', { maximumFractionDigits: 2 });

function ItemForm({ initial, cats, onClose, onSaved }: { initial: Draft; cats: Cat[]; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);
  const [d, setD] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const used = new Map(d.usages.map((u) => [u.productId, u.amount]));

  const toggleProduct = (id: string) =>
    setD((x) => ({ ...x, usages: used.has(id) ? x.usages.filter((u) => u.productId !== id) : [...x.usages, { productId: id, amount: 1 }] }));
  const setAmount = (id: string, amount: number) => setD((x) => ({ ...x, usages: x.usages.map((u) => (u.productId === id ? { ...u, amount } : u)) }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(d.id ? `/api/admin/inventory/${d.id}` : '/api/admin/inventory', {
        method: d.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error);
      toast.success('Insumo guardado');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[3px] sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={d.id ? 'Editar insumo' : 'Nuevo insumo'}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[1.75rem] border border-carbon/10 bg-card sm:rounded-[1.75rem]"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="display text-2xl text-carbon">{d.id ? 'Editar insumo' : 'Nuevo insumo'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full border border-carbon/15">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Nombre</span>
            <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Ej: Pan brioche" className="field" />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Existencia</span>
              <input type="number" min={0} step="any" value={d.quantity} onChange={(e) => setD({ ...d, quantity: Number(e.target.value) })} className="field" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Unidad</span>
              <input value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })} placeholder="u, kg, L" className="field" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-carbon/75">Avisar con</span>
              <input type="number" min={0} step="any" value={d.lowAt} onChange={(e) => setD({ ...d, lowAt: Number(e.target.value) })} className="field" />
            </label>
          </div>
          <div>
            <span className="block text-sm font-semibold text-carbon/75">¿Qué productos lo usan?</span>
            <span className="mb-2 block text-[12px] text-carbon/55">Cada venta descuenta la cantidad indicada. Si se acaba, esos productos salen como agotados.</span>
            <div className="space-y-3">
              {cats.map((c) => (
                <div key={c.id}>
                  <p className="eyebrow mb-1.5">{c.name}</p>
                  <div className="space-y-1">
                    {c.products.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-carbon/[0.03]">
                        <label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm text-carbon">
                          <input type="checkbox" checked={used.has(p.id)} onChange={() => toggleProduct(p.id)} className="h-4 w-4" />
                          <span className="truncate">{p.name}</span>
                        </label>
                        {used.has(p.id) && (
                          <label className="flex items-center gap-1.5 text-[12px] text-carbon/60">
                            usa
                            <input type="number" min={0.01} step="any" value={used.get(p.id)} onChange={(e) => setAmount(p.id, Number(e.target.value))} className="field w-16 px-2 py-1 text-sm" aria-label={`Cantidad que usa ${p.name}`} />
                            {d.unit}
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-carbon/10 px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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

export default function InventoryPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/inventory', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setItems)
      .catch(() => toast.error('No se pudo cargar el inventario'));
  }, []);

  useEffect(() => {
    load();
    fetch('/api/products')
      .then((r) => r.json())
      .then((d: Cat[]) => setCats(d.map((c) => ({ id: c.id, name: c.name, products: c.products.map((p) => ({ id: p.id, name: p.name })) }))))
      .catch(() => {});
  }, [load]);

  const low = useMemo(() => items?.filter((i) => i.quantity <= i.lowAt) ?? [], [items]);

  const adjust = async (item: Item, add: number) => {
    setItems((list) => list?.map((x) => (x.id === item.id ? { ...x, quantity: Math.max(0, x.quantity + add) } : x)) ?? null);
    const res = await fetch(`/api/admin/inventory/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ add }) });
    if (!res.ok) {
      toast.error('No se pudo ajustar');
      load();
    }
  };

  const restock = async (item: Item) => {
    const v = window.prompt(`¿Cuánto ${item.unit} de "${item.name}" llegó? (se suma a la existencia)`, '10');
    if (v === null) return;
    const n = Number(v.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return toast.error('Cantidad inválida');
    await adjust(item, n);
    toast.success(`+${fmt(n)} ${item.unit} de ${item.name}`);
  };

  const remove = async (item: Item) => {
    if (!window.confirm(`¿Eliminar "${item.name}" del inventario?`)) return;
    const res = await fetch(`/api/admin/inventory/${item.id}`, { method: 'DELETE' });
    if (res.ok) load();
    else toast.error('No se pudo eliminar');
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl text-carbon leading-none">Inventario</h1>
          <p className="text-sm text-carbon/65 mt-2">Cada venta descuenta los insumos; si uno se acaba, sus productos se agotan solos en el menú.</p>
        </div>
        <button type="button" onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo insumo
        </button>
      </div>

      {low.length > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose/35 bg-rose/10 px-4 py-3 text-sm text-rose" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Inventario bajo:</b> {low.map((i) => `${i.name} (${fmt(i.quantity)} ${i.unit})`).join(', ')}
          </span>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {!items && [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        {items && items.length === 0 && (
          <EmptyState icon={<Boxes className="h-7 w-7" />} title="Sin insumos" description="Agrega el pan, la carne, el queso… e indica qué productos los usan." />
        )}
        {items?.map((it) => {
          const out = it.quantity <= 0;
          const isLow = !out && it.quantity <= it.lowAt;
          return (
            <div key={it.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-carbon">
                  {it.name}
                  {out && <span className="badge badge-danger">Agotado</span>}
                  {isLow && <span className="badge badge-warning">Bajo</span>}
                </p>
                <p className="truncate text-[12px] text-carbon/55">{it.usages.length ? `Lo usan: ${it.usages.map((u) => u.productName).join(', ')}` : 'Ningún producto lo usa todavía'}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-carbon/15 p-0.5">
                <button type="button" onClick={() => adjust(it, -1)} disabled={out} aria-label={`Restar 1 ${it.unit} de ${it.name}`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-carbon/[0.06] disabled:opacity-35">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className={`min-w-16 text-center text-sm font-semibold tabular-nums ${out ? 'text-rose' : isLow ? 'text-status-preparing' : 'text-carbon'}`}>
                  {fmt(it.quantity)} {it.unit}
                </span>
                <button type="button" onClick={() => adjust(it, 1)} aria-label={`Sumar 1 ${it.unit} a ${it.name}`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-carbon/[0.06]">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" onClick={() => restock(it)} className="btn btn-outline btn-sm">
                Llegó mercancía
              </button>
              <button type="button" onClick={() => setEditing({ ...it })} aria-label={`Editar ${it.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-carbon/15 hover:bg-carbon/[0.06]">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => remove(it)} aria-label={`Eliminar ${it.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-carbon/15 text-rose hover:bg-rose/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {editing && (
          <ItemForm
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
