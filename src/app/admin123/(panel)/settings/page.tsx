'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminSettingsPage() {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [tableCount, setTableCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || '');
        setTableCount(data.tableCount ?? 10);
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
          setLogoPreview(data.logoUrl);
        }
      })
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
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl: logoUrl || null, tableCount }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      toast.success('Configuración guardada');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="display text-4xl text-carbon sign-yellow leading-none">CONFIGURACIÓN DEL NEGOCIO</h1>
      <p className="text-sm text-carbon/65 mt-2 mb-6">Datos generales del restaurante</p>

      {loading ? (
        <div className="max-w-lg space-y-6">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
      <div className="max-w-lg card p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-carbon/75 mb-1.5">Nombre del Negocio</label>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Burger House"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-carbon/75 mb-1.5">Número de Mesas</label>
          <TextField
            type="number"
            min={1}
            max={100}
            value={tableCount}
            onChange={(e) => setTableCount(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-carbon/75 mb-1.5">Logo del Negocio</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogo}
            className="text-sm text-carbon/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-burger file:text-white file:text-sm file:font-semibold file:cursor-pointer"
          />
          {logoPreview && (
            <div className="mt-3 relative inline-block">
              <img
                src={logoPreview}
                alt="Logo"
                className="w-32 h-32 object-contain rounded-xl border-2 border-carbon/20 bg-carbon/8"
              />
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

        <div className="pt-2">
          <Button variant={saved ? 'success' : 'primary'} onClick={handleSave} disabled={saving}>
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
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
