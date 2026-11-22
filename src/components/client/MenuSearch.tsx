'use client';

import { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  query: string;
  onQuery: (q: string) => void;
  /** Alérgenos que aparecen en el menú (para filtros "Sin …"). */
  allergens: string[];
  avoid: string[];
  onToggleAvoid: (a: string) => void;
}

/** Buscador del menú + filtros rápidos por alérgeno ("Sin gluten", "Sin lácteos"…). */
export default function MenuSearch({ query, onQuery, allergens, avoid, onToggleAvoid }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mb-6 space-y-3">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-carbon/45" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Busca una hamburguesa, papas, bebida…"
          aria-label="Buscar en el menú"
          className="field h-12 w-full rounded-full pl-11 pr-11 text-[15px] [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQuery('');
              inputRef.current?.focus(); // sigue escribiendo sin tocar de nuevo el buscador
            }}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-carbon/60 hover:bg-carbon/[0.08]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      {allergens.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none" role="group" aria-label="Filtrar por alérgenos">
          {allergens.map((a) => {
            const on = avoid.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleAvoid(a)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors active:scale-[0.97] ${
                  on ? 'border-burger bg-burger text-[#0f0d0a]' : 'border-carbon/15 text-carbon/75 hover:bg-carbon/[0.05]'
                }`}
              >
                Sin {a.toLowerCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
