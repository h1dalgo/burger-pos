'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Check, Store, DollarSign, Clock, Smartphone, ReceiptText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PublicSettings } from '@/types';

const updated = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function Section({ icon: Icon, title, hint, children }: { icon: typeof Store; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-burger/40 bg-burger/10">
          <Icon className="h-4.5 w-4.5 text-burger" />
        </span>
        <div>
          <h2 className="font-bold text-carbon">{title}</h2>
          {hint && <p className="text-[12px] text-carbon/55">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <span className="block text-sm font-semibold text-carbon/75 mb-1.5">{children}</span>;

export default function AdminSettingsPage() {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [tableCount, setTableCount] = useState(10);
  const [rate, setRate] = useState('');
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [bank, setBank] = useState('');
  const [phone, setPhone] = useState('');
  const [idDoc, setIdDoc] = useState('');
  const [legalName, setLegalName] = useState('');
  const [rif, setRif] = useState('');
  const [address, setAddress] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [footer, setFooter] = useState('');
  const [status, setStatus] = useState<{ open: boolean; message: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const apply = (data: PublicSettings) => {
    setName(data.name || '');
    setTableCount(data.tableCount ?? 10);
    setRate(data.exchangeRate ? String(data.exchangeRate) : '');
    setRateUpdatedAt(data.rateUpdatedAt);
    setIsOpen(data.isOpen ?? true);
    setOpenTime(data.openTime ?? '');
    setCloseTime(data.closeTime ?? '');
    setBank(data.pagoMovilBank ?? '');
    setPhone(data.pagoMovilPhone ?? '');
    setIdDoc(data.pagoMovilId ?? '');
    setLegalName(data.legalName ?? '');
    setRif(data.rif ?? '');
    setAddress(data.address ?? '');
    setBizPhone(data.phone ?? '');
    setTaxRate(data.taxRate ? String(data.taxRate) : '');
    setFooter(data.receiptFooter ?? '');
    setStatus({ open: data.open, message: data.message });
    if (data.logoUrl) {
      setLogoUrl(data.logoUrl);
      setLogoPreview(data.logoUrl);
    }
  };

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then(apply)
      .catch(() => toast.error('No pudimos cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (saving) return;
    const r = rate.trim() ? Number(rate.replace(',', '.')) : 0;
    if (!Number.isFinite(r) || r < 0) {
      toast.error('La tasa debe ser un número');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          logoUrl: logoUrl || null,
          tableCount,
          exchangeRate: r,
          isOpen,
          openTime,
          closeTime,
          pagoMovilBank: bank,
          pagoMovilPhone: phone,
          pagoMovilId: idDoc,
          legalName,
          rif,
          address,
          phone: bizPhone,
          taxRate: taxRate.trim() ? Number(taxRate.replace(',', '.')) : 0,
          receiptFooter: footer,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error);
      const fresh = await fetch('/api/settings', { cache: 'no-store' }).then((x) => x.json());
      apply(fresh);
      setSaved(true);
      toast.success('Configuración guardada');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="display text-4xl text-carbon leading-none">Configuración del negocio</h1>
      <p className="text-sm text-carbon/65 mt-2 mb-6">Datos generales, tasa del día, horario y Pago Móvil</p>

      {loading ? (
        <div className="max-w-xl space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <div className="max-w-xl space-y-5">
          <Section icon={DollarSign} title="Tasa del día" hint="Los precios se muestran en dólares y en bolívares con esta tasa. Déjala vacía para mostrar solo dólares.">
            <label className="block">
              <Label>Bolívares por dólar</Label>
              <TextField inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ej: 36,50" />
            </label>
            {rateUpdatedAt && <p className="text-[12px] text-carbon/50">Actualizada el {updated.format(new Date(rateUpdatedAt))}</p>}
          </Section>

          <Section icon={Clock} title="Horario" hint="Fuera de horario el menú se puede ver pero no se pueden enviar pedidos.">
            {status && (
              <p className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${status.open ? 'bg-mint/12 text-mint-ink' : 'bg-rose/10 text-rose'}`}>
                Ahora mismo: {status.open ? 'abierto, recibiendo pedidos' : `cerrado (${status.message ?? 'sin pedidos'})`}
              </p>
            )}
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-carbon">Recibir pedidos</span>
                <span className="block text-[12px] text-carbon/55">Apágalo para cerrar ya, sin importar la hora</span>
              </span>
              <button type="button" role="switch" aria-checked={isOpen} onClick={() => setIsOpen((v) => !v)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${isOpen ? 'bg-mint' : 'bg-carbon/20'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${isOpen ? 'left-6' : 'left-1'}`} />
              </button>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>Abre</Label>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="field" />
              </label>
              <label>
                <Label>Cierra</Label>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="field" />
              </label>
            </div>
            <p className="text-[12px] text-carbon/50">Deja ambas horas vacías para no tener horario. Si cierra después de medianoche (ej. 18:00 a 02:00) también funciona.</p>
          </Section>

          <Section icon={Smartphone} title="Pago Móvil" hint="El cliente ve estos datos al elegir Pago Móvil, con botón para copiar.">
            <label className="block">
              <Label>Banco</Label>
              <TextField value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ej: 0102 Banco de Venezuela" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>Teléfono</Label>
                <TextField inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0414-1234567" />
              </label>
              <label>
                <Label>Cédula / RIF</Label>
                <TextField value={idDoc} onChange={(e) => setIdDoc(e.target.value)} placeholder="V-12345678" />
              </label>
            </div>
          </Section>

          <Section icon={ReceiptText} title="Recibo digital" hint="Aparece en el recibo que recibe el cliente al confirmarse el pago.">
            <label className="block">
              <Label>Razón social</Label>
              <TextField value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Ej: Inversiones Burger House C.A." />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>RIF</Label>
                <TextField value={rif} onChange={(e) => setRif(e.target.value.toUpperCase())} placeholder="J-12345678-9" />
              </label>
              <label>
                <Label>Teléfono</Label>
                <TextField inputMode="tel" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="0212-1234567" />
              </label>
            </div>
            <label className="block">
              <Label>Dirección</Label>
              <TextField value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Principal, Local 3, Caracas" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>IVA incluido (%)</Label>
                <TextField inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ej: 16" />
              </label>
              <label>
                <Label>Mensaje al pie</Label>
                <TextField value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="¡Gracias por tu visita!" />
              </label>
            </div>
            <p className="text-[12px] text-carbon/50">
              Con IVA, el recibo separa base imponible e impuesto (los precios ya lo incluyen). Es un comprobante no fiscal: no reemplaza la factura de una máquina fiscal o
              imprenta digital autorizada por el SENIAT.
            </p>
          </Section>

          <Section icon={Store} title="Negocio">
            <label className="block">
              <Label>Nombre del negocio</Label>
              <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Burger House" />
            </label>
            <label className="block">
              <Label>Número de mesas</Label>
              <TextField type="number" min={1} max={100} value={tableCount} onChange={(e) => setTableCount(Number(e.target.value))} />
            </label>
            <div>
              <Label>Logo del negocio</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogo}
                className="text-sm text-carbon/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-burger file:text-cream file:text-sm file:font-semibold file:cursor-pointer"
              />
              {logoPreview && (
                <div className="mt-3 relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo" className="w-32 h-32 object-contain rounded-xl border border-carbon/20 bg-carbon/5" />
                  <button
                    type="button"
                    aria-label="Quitar logo"
                    onClick={() => {
                      setLogoPreview('');
                      setLogoUrl('');
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose text-white flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </Section>

          <div className="sticky bottom-4 z-10">
            <Button variant={saved ? 'success' : 'primary'} onClick={handleSave} disabled={saving} size="lg" fullWidth>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Guardado
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
