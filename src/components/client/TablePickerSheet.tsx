'use client';

import { motion } from 'framer-motion';
import { X, Table2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  tableCount: number;
  current: string;
  onSelect: (table: string) => void;
}

export default function TablePickerSheet({ onClose, tableCount, current, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Elegir mesa"
        className="absolute bottom-0 left-0 right-0 sm:max-w-lg sm:mx-auto max-h-[85vh] bg-cream rounded-t-3xl overflow-y-auto overscroll-contain flex flex-col"
      >
        <div className="sticky top-0 z-10 bg-cream px-6 pt-5 pb-3 border-b-2 border-carbon flex items-center justify-between">
          <div>
            <h2 className="display text-2xl text-carbon sign-yellow">¿En qué mesa estás?</h2>
            <p className="text-xs text-carbon/50 mt-1">Cámbiate de mesa cuando quieras tocando aquí</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full bg-card border-2 border-carbon flex items-center justify-center hover:bg-mustard transition-colors"
          >
            <X className="w-4.5 h-4.5 text-carbon" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-5 gap-2.5">
          {Array.from({ length: tableCount }, (_, i) => i + 1).map((n) => {
            const table = String(n);
            const selected = table === current;
            return (
              <button
                key={n}
                onClick={() => onSelect(table)}
                aria-label={`Mesa ${n}${selected ? ' (actual)' : ''}`}
                aria-pressed={selected}
                className={`aspect-square rounded-xl border-2 text-sm font-bold transition-[border-color,background-color,box-shadow] flex items-center justify-center ${
                  selected
                    ? 'bg-mustard border-carbon text-carbon shadow-card'
                    : 'bg-card border-carbon/30 text-carbon/70 hover:border-carbon hover:bg-mustard/40'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {current && (
          <p className="px-6 pb-2 text-xs text-carbon/50 flex items-center gap-1.5" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <Table2 className="w-3.5 h-3.5" />
            Ahora estás en la mesa {current}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
