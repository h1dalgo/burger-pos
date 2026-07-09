'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

interface Props {
  product?: any;
}

interface Variation { name: string; additionalPrice: string }
interface Extra { name: string; basePrice: string }
interface SelectionOption { name: string; additionalPrice: string }
interface RequiredSelection { label: string; maxSelections: number; options: SelectionOption[] }

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
  const [variations, setVariations] = useState<Variation[]>(product?.variations?.map((v: any) => ({ name: v.name, additionalPrice: v.additionalPrice?.toString() || '0' })) || []);
  const [defaultIngredients, setDefaultIngredients] = useState<string[]>(product?.defaultIngredients?.map((d: any) => d.name) || []);
  const [extras, setExtras] = useState<Extra[]>(product?.extraIngredients?.map((e: any) => ({ name: e.name, basePrice: e.basePrice?.toString() || '1.0' })) || []);
  const [selections, setSelections] = useState<RequiredSelection[]>(product?.requiredSelections?.map((rs: any) => ({
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

  const addVariation = () => setVariations([...variations, { name: '', additionalPrice: '0' }]);
  const addIngredient = () => setDefaultIngredients([...defaultIngredients, '']);
  const addExtra = () => setExtras([...extras, { name: '', basePrice: '1.0' }]);
  const addSelection = () => setSelections([...selections, { label: '', maxSelections: 1, options: [] }]);

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
        options: s.options.filter(o => o.name.trim()),
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

  const inputClass = "w-full px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none";
  const btnClass = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors";

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
          <input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)} className={inputClass} required />
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
          <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-300">Variaciones</span><button type="button" onClick={addVariation} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button></div>
          {variations.map((v, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input placeholder="Nombre" value={v.name} onChange={e => { const n = [...variations]; n[i].name = e.target.value; setVariations(n); }} className={`${inputClass} flex-1`} />
              <input type="number" step="0.01" placeholder="$0.00" value={v.additionalPrice} onChange={e => { const n = [...variations]; n[i].additionalPrice = e.target.value; setVariations(n); }} className={`${inputClass} w-20`} />
              <button type="button" onClick={() => setVariations(variations.filter((_, j) => j !== i))}><X className="w-4 h-4 text-[#EF476F]" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-300">Ingredientes por defecto</span><button type="button" onClick={addIngredient} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button></div>
        {defaultIngredients.map((ing, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input placeholder="Ej: Queso Cheddar" value={ing} onChange={e => { const n = [...defaultIngredients]; n[i] = e.target.value; setDefaultIngredients(n); }} className={`${inputClass} flex-1`} />
            <button type="button" onClick={() => setDefaultIngredients(defaultIngredients.filter((_, j) => j !== i))}><X className="w-4 h-4 text-[#EF476F]" /></button>
          </div>
        ))}
      </div>

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-300">Extras (con costo)</span><button type="button" onClick={addExtra} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button></div>
        {extras.map((e, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input placeholder="Nombre" value={e.name} onChange={ev => { const n = [...extras]; n[i].name = ev.target.value; setExtras(n); }} className={`${inputClass} flex-1`} />
            <input type="number" step="0.01" placeholder="$1.00" value={e.basePrice} onChange={ev => { const n = [...extras]; n[i].basePrice = ev.target.value; setExtras(n); }} className={`${inputClass} w-20`} />
            <button type="button" onClick={() => setExtras(extras.filter((_, j) => j !== i))}><X className="w-4 h-4 text-[#EF476F]" /></button>
          </div>
        ))}
      </div>

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-300">Selecciones requeridas</span><button type="button" onClick={addSelection} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button></div>
        {selections.map((sel, i) => (
          <div key={i} className="bg-[#1a1a2e] rounded-lg p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <input placeholder="Ej: Salsas extras" value={sel.label} onChange={e => { const n = [...selections]; n[i].label = e.target.value; setSelections(n); }} className={`${inputClass} flex-1`} />
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>Máx:</span>
                <input type="number" min="1" value={sel.maxSelections} onChange={e => { const n = [...selections]; n[i].maxSelections = parseInt(e.target.value) || 1; setSelections(n); }} className="w-12 px-2 py-1 rounded bg-[#0F0F23] border border-gray-700 text-white text-center" />
              </div>
              <button type="button" onClick={() => setSelections(selections.filter((_, j) => j !== i))}><X className="w-4 h-4 text-[#EF476F]" /></button>
            </div>
            <div className="space-y-1 ml-2">
              {sel.options.map((opt, oi) => (
                <div key={oi} className="flex gap-2 items-center">
                  <input placeholder="Opción" value={opt.name} onChange={e => { const n = [...selections]; n[i].options[oi].name = e.target.value; setSelections(n); }} className={`${inputClass} flex-1 text-xs`} />
                  <input type="number" step="0.01" placeholder="$+" value={opt.additionalPrice} onChange={e => { const n = [...selections]; n[i].options[oi].additionalPrice = e.target.value; setSelections(n); }} className={`${inputClass} w-16 text-xs`} />
                  <button type="button" onClick={() => { const n = [...selections]; n[i].options = n[i].options.filter((_, j) => j !== oi); setSelections(n); }}><X className="w-3 h-3 text-[#EF476F]" /></button>
                </div>
              ))}
              <button type="button" onClick={() => { const n = [...selections]; n[i].options.push({ name: '', additionalPrice: '0' }); setSelections(n); }} className="text-[#06D6A0] text-xs hover:underline">+ Opción</button>
            </div>
          </div>
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
