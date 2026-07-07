import { create } from 'zustand';
import type { CartItem, ExtraIngredient, Product, ProductVariation } from '@/types';
import { generateId } from '@/lib/utils';

interface CartState {
  items: CartItem[];
  paymentMethod: 'CASH' | 'MOBILE_PAYMENT' | 'CARD' | null;
  addItem: (params: {
    product: Product;
    variation: ProductVariation | null;
    quantity: number;
    removedIngredients: string[];
    addedExtras: ExtraIngredient[];
    selections: Record<string, string[]>;
  }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  setPaymentMethod: (method: 'CASH' | 'MOBILE_PAYMENT' | 'CARD') => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getTotalItems: () => number;
  getItemPrice: (item: CartItem) => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  paymentMethod: null,

  addItem: ({ product, variation, quantity, removedIngredients, addedExtras, selections }) => {
    const itemPrice = get().getItemPrice({
      id: '',
      product,
      variation,
      quantity: 1,
      removedIngredients,
      addedExtras,
      selections,
    });

    set((state) => ({
      items: [
        ...state.items,
        {
          id: generateId(),
          product,
          variation,
          quantity,
          removedIngredients,
          addedExtras,
          selections,
        },
      ],
    }));
  },

  removeItem: (itemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
    }));
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i)),
    }));
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  clearCart: () => set({ items: [], paymentMethod: null }),

  getTotalAmount: () => {
    return get().items.reduce((total, item) => {
      return total + get().getItemPrice(item) * item.quantity;
    }, 0);
  },

  getTotalItems: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },

  getItemPrice: (item) => {
    let price = Number(item.product.basePrice);
    if (item.variation) {
      price += Number(item.variation.additionalPrice);
    }
    for (const extra of item.addedExtras) {
      price += Number(extra.basePrice);
    }
    return price;
  },
}));
