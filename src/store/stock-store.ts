import { create } from 'zustand';
import type { StockUpdate } from '@/types';

interface StockState {
  unavailableProducts: Set<string>;
  unavailableVariations: Set<string>;
  unavailableOptions: Set<string>;
  unavailableExtras: Set<string>;
  applyStockUpdate: (update: StockUpdate) => void;
  initializeFromProducts: (products: { id: string; isAvailable: boolean; variations: { id: string; isAvailable: boolean }[] }[]) => void;
  isProductAvailable: (productId: string) => boolean;
  isVariationAvailable: (variationId: string) => boolean;
  isOptionAvailable: (optionId: string) => boolean;
  isExtraAvailable: (extraId: string) => boolean;
}

export const useStockStore = create<StockState>()((set, get) => ({
  unavailableProducts: new Set(),
  unavailableVariations: new Set(),
  unavailableOptions: new Set(),
  unavailableExtras: new Set(),

  applyStockUpdate: (update) => {
    set((state) => {
      const mapKey =
        update.type === 'product'
          ? 'unavailableProducts'
          : update.type === 'variation'
            ? 'unavailableVariations'
            : update.type === 'option'
              ? 'unavailableOptions'
              : 'unavailableExtras';

      const newSet = new Set(state[mapKey]);
      if (update.isAvailable) {
        newSet.delete(update.id);
      } else {
        newSet.add(update.id);
      }
      return { [mapKey]: newSet };
    });
  },

  initializeFromProducts: (products) => {
    const unavailableProducts = new Set<string>();
    const unavailableVariations = new Set<string>();

    for (const p of products) {
      if (!p.isAvailable) unavailableProducts.add(p.id);
      for (const v of p.variations) {
        if (!v.isAvailable) unavailableVariations.add(v.id);
      }
    }

    set({ unavailableProducts, unavailableVariations });
  },

  isProductAvailable: (productId) => !get().unavailableProducts.has(productId),
  isVariationAvailable: (variationId) => !get().unavailableVariations.has(variationId),
  isOptionAvailable: (optionId) => !get().unavailableOptions.has(optionId),
  isExtraAvailable: (extraId) => !get().unavailableExtras.has(extraId),
}));
