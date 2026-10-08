'use client';

import { useState, useEffect } from 'react';
import { QrCode, Printer, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

interface QrItem {
  table: string;
  dataUrl: string;
}

export default function QrPage() {
  const [items, setItems] = useState<QrItem[] | null>(null);
  const [error, setError] = useState(false);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        const settings = settingsRes.ok ? await settingsRes.json() : null;
        const tableCount = typeof settings?.tableCount === 'number' && settings.tableCount > 0 ? settings.tableCount : 10;
        if (settings?.name) setBusinessName(String(settings.name).toUpperCase());

        const QRCode = (await import('qrcode')).default ?? (await import('qrcode'));
        const origin = window.location.origin;
        const generated: QrItem[] = [];
        for (let i = 1; i <= tableCount; i++) {
          const dataUrl = await QRCode.toDataURL(`${origin}/?mesa=${i}`, {
            margin: 1,
            width: 480,
            errorCorrectionLevel: 'M',
            color: { dark: '#1a1712ff', light: '#fdf6e3ff' },
          });
          generated.push({ table: String(i), dataUrl });
        }
        if (!cancelled) setItems(generated);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="display text-3xl text-carbon sign-yellow">Códigos QR por Mesa</h1>
          <p className="text-sm text-carbon/60 mt-1">
            Imprimilos y pegalos en cada mesa: al escanearlos el pedido abre con la mesa lista.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()} disabled={!items}>
          <Printer className="w-4 h-4" />
          Imprimir códigos
        </Button>
      </div>

      {error ? (
        <EmptyState
          icon={<QrCode className="w-8 h-8" />}
          title="No pudimos generar los QR"
          description="Reintenta en unos segundos."
          action={
            <Button onClick={() => window.location.reload()} className="mt-3">
              Reintentar
            </Button>
          }
        />
      ) : !items ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.table}
              className="card p-4 border-2 border-carbon/20 flex flex-col items-center text-center print:break-inside-avoid print:border-carbon/40"
            >
              <div className="w-10 h-10 rounded-xl bg-mustard border-2 border-carbon flex items-center justify-center font-bold text-carbon mb-2 print:w-8 print:h-8">
                {item.table}
              </div>
              <img
                src={item.dataUrl}
                alt={`Código QR de la mesa ${item.table}`}
                className="w-full max-w-52 aspect-square"
              />
              <p className="display text-lg text-carbon sign-yellow mt-2 leading-none">{businessName || 'BURGER POS'}</p>
              <p className="text-xs font-bold text-burger uppercase tracking-widest mt-1">Mesa {item.table}</p>
              <p className="text-[10px] text-carbon/55 mt-1">Escanea y pide desde tu lugar</p>
            </div>
          ))}
        </div>
      )}

      {!items && !error && (
        <p className="flex items-center gap-2 text-sm text-carbon/50 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generando códigos…
        </p>
      )}
    </div>
  );
}
