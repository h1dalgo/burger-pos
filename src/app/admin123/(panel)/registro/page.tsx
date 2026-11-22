'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AUDIT_ACTIONS, SENSITIVE_ACTIONS, type AuditAction } from '@/lib/audit-labels';

interface Entry {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  orderId: string | null;
  detail: string;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hm = new Intl.DateTimeFormat('es-VE', { hour: '2-digit', minute: '2-digit' });

export default function RegistroPage() {
  const [day, setDay] = useState(today);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Entry[] | null>(null);

  // el nombre se busca al dejar de escribir
  useEffect(() => {
    const t = setTimeout(() => setActor(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(() => {
    const from = new Date(`${day}T00:00:00`);
    const to = new Date(`${day}T23:59:59.999`);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (action) qs.set('action', action);
    if (actor) qs.set('actor', actor);
    fetch(`/api/admin/audit?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => {
        setRows([]);
        toast.error('No se pudo cargar el registro');
      });
  }, [day, action, actor]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="max-w-4xl">
      <h1 className="display text-4xl leading-none text-carbon">Registro</h1>
      <p className="mt-2 text-sm text-carbon/65">
        Quién canceló, cobró, movió de mesa o cambió la tasa, un precio o una promoción. Lo marcado en rojo conviene revisarlo.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <input type="date" value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Día" className="field" />
        <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Tipo de acción" className="field">
          <option value="">Todas las acciones</option>
          {Object.entries(AUDIT_ACTIONS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <label className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon/45" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por persona" aria-label="Buscar por persona" className="field w-full pl-9" />
        </label>
      </div>

      <div className="mt-5 space-y-1.5">
        {!rows && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        {rows && rows.length === 0 && <EmptyState icon={<History className="h-7 w-7" />} title="Nada registrado" description="No hay acciones con esos filtros este día." />}
        {rows?.map((r) => {
          const hot = SENSITIVE_ACTIONS.includes(r.action);
          return (
            <div key={r.id} className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${hot ? 'border-rose/30 bg-rose/[0.06]' : 'border-carbon/10 bg-carbon/[0.02]'}`}>
              <span className="w-[4.5rem] shrink-0 whitespace-nowrap pt-0.5 text-[12px] tabular-nums text-carbon/55">{hm.format(new Date(r.at))}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className={`font-semibold ${hot ? 'text-rose' : 'text-carbon'}`}>{AUDIT_ACTIONS[r.action] ?? r.action}</span>
                  <span className="text-carbon/55"> · {r.actor}</span>
                </p>
                <p className="mt-0.5 break-words text-[12px] text-carbon/65">{r.detail}</p>
              </div>
            </div>
          );
        })}
        {rows && rows.length === 500 && <p className="pt-2 text-center text-[12px] text-carbon/55">Se muestran las últimas 500 acciones del día. Filtra para ver otras.</p>}
      </div>
    </div>
  );
}
