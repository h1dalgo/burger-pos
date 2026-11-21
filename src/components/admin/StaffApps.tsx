'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Smartphone } from 'lucide-react';
import { ROLE_APPS, type AppRole } from '@/lib/app-roles';

const STAFF: Exclude<AppRole, 'clientes'>[] = ['meseros', 'cocina', 'admin'];

/**
 * Apps del personal: un QR por sección. El empleado lo escanea, abre la
 * sección y la instala; la app queda con su nombre e ícono y abre directo ahí.
 */
export default function StaffApps() {
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const QRCode = (await import('qrcode')).default ?? (await import('qrcode'));
      const o = window.location.origin;
      const out: Record<string, string> = {};
      for (const r of STAFF) {
        out[r] = await QRCode.toDataURL(o + ROLE_APPS[r].startUrl, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#1a1712ff', light: '#fbf7efff' } });
      }
      if (alive) {
        setOrigin(o);
        setQrs(out);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const copy = async (r: string) => {
    try {
      await navigator.clipboard.writeText(origin + ROLE_APPS[r as AppRole].startUrl);
      setCopied(r);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* sin portapapeles */
    }
  };

  return (
    <section className="card p-5 print:hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-burger/40 bg-burger/10">
          <Smartphone className="h-4.5 w-4.5 text-burger" />
        </span>
        <div>
          <h2 className="font-bold text-carbon">Apps del personal</h2>
          <p className="text-[13px] text-carbon/60">Cada empleado escanea el código de su área y la instala: queda con su propio ícono y abre directo en su sección.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {STAFF.map((r) => (
          <div key={r} className="flex flex-col items-center rounded-2xl border border-carbon/10 bg-carbon/[0.03] p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/icons/${r}?size=192`} alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
            <p className="mt-2 font-semibold text-carbon">{ROLE_APPS[r].shortName}</p>
            <p className="text-[11px] text-carbon/55">{ROLE_APPS[r].description}</p>
            {qrs[r] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrs[r]} alt={`Código QR para instalar la app de ${ROLE_APPS[r].shortName}`} className="mt-3 aspect-square w-full max-w-40 rounded-lg" />
            ) : (
              <div className="skeleton mt-3 aspect-square w-full max-w-40" />
            )}
            <button type="button" onClick={() => copy(r)} className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-burger-dark">
              {copied === r ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === r ? 'Enlace copiado' : 'Copiar enlace'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 text-[12px] text-carbon/65 sm:grid-cols-2">
        <p>
          <b className="text-carbon">iPhone:</b> abrir el enlace en <b>Safari</b> → botón Compartir → <b>Agregar a pantalla de inicio</b>.
        </p>
        <p>
          <b className="text-carbon">Android:</b> abrir el enlace en <b>Chrome</b> → menú ⋮ → <b>Instalar app</b> (o Agregar a pantalla principal).
        </p>
      </div>
    </section>
  );
}
