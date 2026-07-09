'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface Props {
  product?: any;
}

const inputClass = "px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none";
const inputWide = "w-full px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none";
const btnClass = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors";

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const isEdit = !!product;
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLSelectElement>(null);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || '');
  const [hasVariation, setHasVariation] = useState(product?.hasVariation || false);

  const [variationKeys, setVariationKeys] = useState<number[]>(product?.variations?.map((_: any, i: number) => i) || [0]);
  const varNameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const varPriceRefs = useRef<(HTMLInputElement | null)[]>([]);
  let varCounter = useRef(product?.variations?.length || 0);

  const [ingredientKeys, setIngredientKeys] = useState<number[]>(product?.defaultIngredients?.map((_: any, i: number) => i) || []);
  const ingRefs = useRef<(HTMLInputElement | null)[]>([]);
  let ingCounter = useRef(product?.defaultIngredients?.length || 0);

  const [extraKeys, setExtraKeys] = useState<number[]>(product?.extraIngredients?.map((_: any, i: number) => i) || []);
  const extraNameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const extraPriceRefs = useRef<(HTMLInputElement | null)[]>([]);
  let extraCounter = useRef(product?.extraIngredients?.length || 0);

  const [selKeys, setSelKeys] = useState<number[]>(product?.requiredSelections?.map((_: any, i: number) => i) || []);
  let selCounter = useRef(product?.requiredSelections?.length || 0);

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

  const collectVariations = () => {
    const result: { name: string; additionalPrice: string }[] = [];
    for (let i = 0; i < variationKeys.length; i++) {
      const vn = varNameRefs.current[i]?.value?.trim();
      const vp = varPriceRefs.current[i]?.value || '0';
      if (vn) result.push({ name: vn, additionalPrice: vp });
    }
    return result;
  };

  const collectIngredients = () => {
    const result: string[] = [];
    for (let i = 0; i < ingredientKeys.length; i++) {
      const v = ingRefs.current[i]?.value?.trim();
      if (v) result.push(v);
    }
    return result;
  };

  const collectExtras = () => {
    const result: { name: string; basePrice: string }[] = [];
    for (let i = 0; i < extraKeys.length; i++) {
      const en = extraNameRefs.current[i]?.value?.trim();
      const ep = extraPriceRefs.current[i]?.value || '1.0';
      if (en) result.push({ name: en, basePrice: ep });
    }
    return result;
  };

  const collectSelections = () => {
    const result: any[] = [];
    for (let i = 0; i < selKeys.length; i++) {
      const container = document.getElementById(`selection-${selKeys[i]}`);
      if (!container) continue;
      const label = (container.querySelector('[data-sel-label]') as HTMLInputElement)?.value?.trim();
      const max = (container.querySelector('[data-sel-max]') as HTMLInputElement)?.value || '1';
      if (!label) continue;
      const opts: { name: string; additionalPrice: string }[] = [];
      const optInputs = container.querySelectorAll('[data-sel-opt-name]');
      const optPrices = container.querySelectorAll('[data-sel-opt-price]');
      for (let j = 0; j < optInputs.length; j++) {
        const on = (optInputs[j] as HTMLInputElement).value?.trim();
        const op = (optPrices[j] as HTMLInputElement).value || '0';
        if (on) opts.push({ name: on, additionalPrice: op });
      }
      result.push({ label, maxSelections: max, options: opts });
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: nameRef.current?.value || '',
      description: descRef.current?.value || '',
      basePrice: priceRef.current?.value || '0',
      categoryId: catRef.current?.value || '',
      imageUrl: imageUrl || null,
      hasVariation,
      variations: collectVariations(),
      defaultIngredients: collectIngredients(),
      extraIngredients: collectExtras(),
      requiredSelections: collectSelections(),
    };

    const url = isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) router.push('/admin123/products');
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
          <input ref={nameRef} defaultValue={product?.name || ''} className={inputWide} required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Descripción</label>
          <textarea ref={descRef} defaultValue={product?.description || ''} className={inputWide} rows={2} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Precio Base *</label>
          <input ref={priceRef} defaultValue={product?.basePrice?.toString() || ''} className={inputWide} required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Categoría *</label>
          <select ref={catRef} defaultValue={product?.categoryId || product?.category?.id || ''} className={inputWide} required>
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
            <button type="button" onClick={() => { varCounter.current++; setVariationKeys([...variationKeys, varCounter.current]); }} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
          </div>
          {variationKeys.map((k, i) => (
            <div key={k} className="flex gap-2 items-center">
              <input ref={el => varNameRefs.current[i] = el} defaultValue={product?.variations?.[i]?.name || ''} placeholder="Nombre" className={`${inputClass} flex-1`} />
              <input ref={el => varPriceRefs.current[i] = el} defaultValue={product?.variations?.[i]?.additionalPrice?.toString() || '0'} placeholder="$0.00" className={`${inputClass} w-20`} />
              <button type="button" onClick={() => { setVariationKeys(variationKeys.filter((_, j) => j !== i)); }}><X className="w-4 h-4 text-[#EF476F]" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">Ingredientes por defecto</span>
          <button type="button" onClick={() => { ingCounter.current++; setIngredientKeys([...ingredientKeys, ingCounter.current]); }} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
        </div>
        {ingredientKeys.map((k, i) => (
          <div key={k} className="flex gap-2 items-center">
            <input ref={el => ingRefs.current[i] = el} defaultValue={product?.defaultIngredients?.[i]?.name || ''} placeholder="Ej: Queso Cheddar" className={`${inputClass} flex-1`} />
            <button type="button" onClick={() => { setIngredientKeys(ingredientKeys.filter((_, j) => j !== i)); }}><X className="w-4 h-4 text-[#EF476F]" /></button>
          </div>
        ))}
      </div>

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">Extras (con costo)</span>
          <button type="button" onClick={() => { extraCounter.current++; setExtraKeys([...extraKeys, extraCounter.current]); }} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
        </div>
        {extraKeys.map((k, i) => (
          <div key={k} className="flex gap-2 items-center">
            <input ref={el => extraNameRefs.current[i] = el} defaultValue={product?.extraIngredients?.[i]?.name || ''} placeholder="Nombre" className={`${inputClass} flex-1`} />
            <input ref={el => extraPriceRefs.current[i] = el} defaultValue={product?.extraIngredients?.[i]?.basePrice?.toString() || '1.0'} placeholder="$1.00" className={`${inputClass} w-20`} />
            <button type="button" onClick={() => { setExtraKeys(extraKeys.filter((_, j) => j !== i)); }}><X className="w-4 h-4 text-[#EF476F]" /></button>
          </div>
        ))}
      </div>

      <div className="bg-[#0F0F23] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">Selecciones requeridas</span>
          <button type="button" onClick={() => { selCounter.current++; setSelKeys([...selKeys, selCounter.current]); }} className="text-[#06D6A0] text-xs hover:underline">+ Agregar</button>
        </div>
        {selKeys.map((k, i) => (
          <SelectionBlock
            key={k}
            id={`selection-${k}`}
            initialLabel={product?.requiredSelections?.[i]?.label || ''}
            initialMax={product?.requiredSelections?.[i]?.maxSelections?.toString() || '1'}
            initialOptions={product?.requiredSelections?.[i]?.options?.map((o: any) => ({ name: o.name || '', price: o.additionalPrice?.toString() || '0' })) || []}
            onRemove={() => { setSelKeys(selKeys.filter((_, j) => j !== i)); }}
          />
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={submitting} className={`${btnClass} bg-[#E85D04] text-white hover:bg-[#d55404] disabled:opacity-50`}>
          {submitting ? 'Guardando...' : isEdit ? 'Actualizar Producto' : 'Crear Producto'}
        </button>
        <button type="button" onClick={() => router.push('/admin123/products')} className={`${btnClass} bg-gray-800 text-gray-300 hover:bg-gray-700`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SelectionBlock({ id, initialLabel, initialMax, initialOptions, onRemove }: {
  id: string;
  initialLabel: string;
  initialMax: string;
  initialOptions: { name: string; price: string }[];
  onRemove: () => void;
}) {
  const [optKeys, setOptKeys] = useState<number[]>(initialOptions.map((_, i) => i));
  let optCounter = useRef(initialOptions.length);

  return (
    <div id={id} className="bg-[#1a1a2e] rounded-lg p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <input data-sel-label defaultValue={initialLabel} placeholder="Ej: Salsas extras" className={`${inputClass} flex-1 min-w-0`} />
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Máx:</span>
          <input data-sel-max defaultValue={initialMax} className="w-12 px-2 py-1 rounded bg-[#0F0F23] border border-gray-700 text-white text-center" />
        </div>
        <button type="button" onClick={onRemove}><X className="w-4 h-4 text-[#EF476F]" /></button>
      </div>
      <div className="space-y-1 ml-2">
        {optKeys.map((ok, oi) => (
          <div key={ok} className="flex gap-2 items-center">
            <input data-sel-opt-name defaultValue={initialOptions[oi]?.name || ''} placeholder="Opción" className={`${inputClass} flex-1 min-w-0 text-xs`} />
            <input data-sel-opt-price defaultValue={initialOptions[oi]?.price || '0'} placeholder="$+" className={`${inputClass} w-16 text-xs`} />
            <button type="button" onClick={() => setOptKeys(optKeys.filter((_, j) => j !== oi))}><X className="w-3 h-3 text-[#EF476F]" /></button>
          </div>
        ))}
        <button type="button" onClick={() => { optCounter.current++; setOptKeys([...optKeys, optCounter.current]); }} className="text-[#06D6A0] text-xs hover:underline">+ Opción</button>
      </div>
    </div>
  );
}
