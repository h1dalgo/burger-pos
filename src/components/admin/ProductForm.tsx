'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface Props {
  product?: any;
}

const inputClass = "w-full px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none";
const btnClass = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors";

function VariationRow({ value, onChange, onRemove }: { value: { name: string; additionalPrice: string }; onChange: (v: { name: string; additionalPrice: string }) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input placeholder="Nombre" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} className={`${inputClass} flex-1`} />
      <input placeholder="$0.00" value={value.additionalPrice} onChange={e => onChange({ ...value, additionalPrice: e.target.value })} className={`${inputClass} w-20`} />
      <button type="button" onClick={onRemove}><X className="w-4 h-4 text-[#EF476F]" /></button>
    </div>
  );
}

function ExtraRow({ value, onChange, onRemove }: { value: { name: string; basePrice: string }; onChange: (v: { name: string; basePrice: string }) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input placeholder="Nombre" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} className={`${inputClass} flex-1`} />
      <input placeholder="$1.00" value={value.basePrice} onChange={e => onChange({ ...value, basePrice: e.target.value })} className={`${inputClass} w-20`} />
      <button type="button" onClick={onRemove}><X className="w-4 h-4 text-[#EF476F]" /></button>
    </div>
  );
}

function SelectionBlock({ value, onChange, onRemove }: {
  value: { label: string; maxSelections: any; options: { name: string; additionalPrice: string }[] };
  onChange: (v: typeof value) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-[#1a1a2e] rounded-lg p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <input placeholder="Ej: Salsas extras" value={value.label} onChange={e => onChange({ ...value, label: e.target.value })} className={`${inputClass} flex-1`} />
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Máx:</span>
          <input value={value.maxSelections} onChange={e => onChange({ ...value, maxSelections: e.target.value })} className="w-12 px-2 py-1 rounded bg-[#0F0F23] border border-gray-700 text-white text-center" />
        </div>
        <button type="button" onClick={onRemove}><X className="w-4 h-4 text-[#EF476F]" /></button>
      </div>
      <div className="space-y-1 ml-2">
        {value.options.map((opt, oi) => (
          <div key={oi} className="flex gap-2 items-center">
            <input placeholder="Opción" value={opt.name} onChange={e => {
              const opts = [...value.options];
              opts[oi] = { ...opts[oi], name: e.target.value };
              onChange({ ...value, options: opts });
            }} className={`${inputClass} flex-1 text-xs`} />
            <input placeholder="$+" value={opt.additionalPrice} onChange={e => {
              const opts = [...value.options];
              opts[oi] = { ...opts[oi], additionalPrice: e.target.value };
              onChange({ ...value, options: opts });
            }} className={`${inputClass} w-16 text-xs`} />
            <button type="button" onClick={() => {
              const opts = value.options.filter((_, j) => j !== oi);
              onChange({ ...value, options: opts });
            }}><X className="w-3 h-3 text-[#EF476F]" /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...value, options: [...value.options, { name: '', additionalPrice: '0' }] })} className="text-[#06D6A0] text-xs hover:underline">+ Opción</button>
      </div>
    </div>
  );
}

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const isEdit = !!product;
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [basePrice, setBasePrice] = useState(product?.basePrice?.toString() || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || product?.category?.id || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [hasVariation, setHasVariation] = useState(product?.hasVariation || false);
  const [variations, setVariations] = useState<{ name: string; additionalPrice: string }[]>(product?.variations?.map((v: any) => ({ name: v.name, additionalPrice: v.additionalPrice?.toString() || '0' })) || []);
  const [defaultIngredients, setDefaultIngredients] = useState<string[]>(product?.defaultIngredients?.map((d: any) => d.name) || []);
  const [extras, setExtras] = useState<{ name: string; basePrice: string }[]>(product?.extraIngredients?.map((e: any) => ({ name: e.name, basePrice: e.basePrice?.toString() || '1.0' })) || []);
  const [selections, setSelections] = useState<any[]>(product?.requiredSelections?.map((rs: any) => ({
    label: rs.label,
    maxSelections: rs.maxSelections,
    options: rs.options?.map((o: any) => ({ name: o.name, additionalPrice: o.additionalPrice?.toString() || '0' })) || [],
  })) || []);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || '');

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then((data: any[]) => {
      if (Array.isArray(data)) setCategories(data.map((c: any) => ({ id: c.id, name: c.name })));
      else if (data?.length === undefined && data?.id) setCategories([{ id: data.id, name: data.name }]);
    });
  }, []);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name, description, basePrice, categoryId,
      imageUrl: imageUrl || null,
      hasVariation,
      variations: variations.filter(v => v.name.trim()),
      defaultIngredients: defaultIngredients.filter(i => i.trim()),
      extraIngredients: extras.filter(e => e.name.trim()),
      requiredSelections: selections.filter(s => s.label.trim()).map(s => ({
        ...s,
        options: s.options.filter((o: any) => o.name.trim()),
      })),
    };

    const url = isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) router.push('/admin/products');
      else alert('Error al guardar');
    } catch {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Nombre del Producto *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Descripción</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className={inputClass} rows={2} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Precio Base *</label>
          <input value={basePrice} onChange={e => setBasePrice(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Categoría *</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass} required>
            <option value="">Seleccionar...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Imagen del Producto</label>
        <input type="file" accept="image/*" onChange={handleImage} className="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#E85D04] file:text-white file:text-sm file:font-semibold" />
        {imagePreview && (
          <div className="mt-2 relative inline-block">
            <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-gray-700" />
            <button type="button" onClick={() => { setImagePreview(''); setImageUrl(''); }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#EF476F] text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="hasVar" checked={hasVariation} onChange={e => setHasVariation(e.target.checked)} className="accent-[#E85D04]" />
        <label htmlFor="hasVar" className="text-sm text-gray-300">Tiene variaciones (ej: Carne/Pollo)</label>
      </div>

      {hasVariation && (
        <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">Variaciones</span>
            <button type="button" onClick={() => setVariations([...variations, { name: '', additionalPrice: '0' }])} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
          </div>
          {variations.map((v, i) => (
            <VariationRow
              key={i}
              value={v}
              onChange={val => {
                const next = [...variations];
                next[i] = val;
                setVariations(next);
              }}
              onRemove={() => setVariations(variations.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">Ingredientes por defecto</span>
          <button type="button" onClick={() => setDefaultIngredients([...defaultIngredients, ''])} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
        </div>
        {defaultIngredients.map((ing, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input placeholder="Ej: Queso Cheddar" value={ing} onChange={e => {
              const next = [...defaultIngredients];
              next[i] = e.target.value;
              setDefaultIngredients(next);
            }} className={`${inputClass} flex-1`} />
            <button type="button" onClick={() => setDefaultIngredients(defaultIngredients.filter((_, j) => j !== i))}><X className="w-4 h-4 text-[#EF476F]" /></button>
          </div>
        ))}
      </div>

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">Extras (con costo)</span>
          <button type="button" onClick={() => setExtras([...extras, { name: '', basePrice: '1.0' }])} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
        </div>
        {extras.map((e, i) => (
          <ExtraRow
            key={i}
            value={e}
            onChange={val => {
              const next = [...extras];
              next[i] = val;
              setExtras(next);
            }}
            onRemove={() => setExtras(extras.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">Selecciones requeridas</span>
          <button type="button" onClick={() => setSelections([...selections, { label: '', maxSelections: 1, options: [] }])} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
        </div>
        {selections.map((sel, i) => (
          <SelectionBlock
            key={i}
            value={sel}
            onChange={val => {
              const next = [...selections];
              next[i] = val;
              setSelections(next);
            }}
            onRemove={() => setSelections(selections.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={submitting} className={`${btnClass} bg-[#E85D04] text-white hover:bg-[#d55404] disabled:opacity-50`}>
          {submitting ? 'Guardando...' : isEdit ? 'Actualizar Producto' : 'Crear Producto'}
        </button>
        <button type="button" onClick={() => router.push('/admin/products')} className={`${btnClass} bg-gray-800 text-gray-300 hover:bg-gray-700`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
