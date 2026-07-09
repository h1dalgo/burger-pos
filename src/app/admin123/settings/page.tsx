'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AdminSettingsPage() {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setName(data.name || '');
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
          setLogoPreview(data.logoUrl);
        }
      });
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
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl: logoUrl || null }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>CONFIGURACIÓN DEL NEGOCIO</h1>

      <div className="max-w-lg space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nombre del Negocio</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Ej: Burger House" />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Logo del Negocio</label>
          <input type="file" accept="image/*" onChange={handleLogo} className="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#E85D04] file:text-white file:text-sm file:font-semibold" />
          {logoPreview && (
            <div className="mt-3 relative inline-block">
              <img src={logoPreview} alt="Logo" className="w-32 h-32 object-contain rounded-xl border border-gray-700 bg-[#0F0F23]" />
              <button type="button" onClick={() => { setLogoPreview(''); setLogoUrl(''); }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#EF476F] text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
            saved ? 'bg-[#06D6A0] text-white' : 'bg-[#E85D04] text-white hover:bg-[#d55404]'
          } disabled:opacity-50`}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
