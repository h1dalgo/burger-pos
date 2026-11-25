import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import type { CartItem, ExtraIngredient, Product, ProductVariation } from '@/types';
import { generateId } from '@/lib/utils';

type Payment = 'CASH' | 'MOBILE_PAYMENT' | 'CARD';
type ItemParams = {
  product: Product;
  variation: ProductVariation | null;
  quantity: number;
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
  selections: Record<string, string[]>;
  selectionLabels?: Record<string, string>;
  note?: string | null;
};

// El último método de pago se recuerda en este dispositivo.
const PAY_KEY = 'burger-pos:payment';
const loadPayment = (): Payment => {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(PAY_KEY) : null;
    return v === 'CASH' || v === 'MOBILE_PAYMENT' || v === 'CARD' ? v : 'CASH';
  } catch {
    return 'CASH';
  }
};

const cleanNote = (note?: string | null) => (note?.trim() ? note.trim().slice(0, 300) : null);

/** Un producto "simple": sin variación, cambios, extras, opciones ni nota. */
const isPlain = (i: CartItem) =>
  !i.variation && !i.removedIngredients.length && !i.addedExtras.length && !Object.values(i.selections).some((v) => v.length) && !i.note;

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
    selectionLabels?: Record<string, string>;
    note?: string | null;
  }) => void;
  /** Agrega un producto sin opciones; si ya hay uno igual, suma 1 a esa línea. */
  addSimple: (product: Product) => void;
  /** Reemplaza un producto ya agregado (al editarlo desde el carrito). */
  replaceItem: (itemId: string, params: ItemParams) => void;
  /** Vuelve a poner un producto borrado en su posición (para "Deshacer"). */
  restoreItem: (item: CartItem, index: number) => void;
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
  paymentMethod: loadPayment(),

  addItem: ({ product, variation, quantity, removedIngredients, addedExtras, selections, selectionLabels, note }) => {
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
          selectionLabels,
          note: cleanNote(note),
        },
      ],
    }));
  },

  addSimple: (product) => {
    // inventario: no se suma más de lo que queda (el servidor igual lo valida)
    if (product.stockLeft != null) {
      const inCart = get().items.filter((i) => i.product.id === product.id).reduce((n, i) => n + i.quantity, 0);
      if (inCart >= product.stockLeft) {
        toast.error(product.stockLeft > 0 ? `Solo ${product.stockLeft === 1 ? 'queda' : 'quedan'} ${product.stockLeft} de ${product.name}` : `${product.name} se agotó`);
        return;
      }
    }
    const same = get().items.find((i) => i.product.id === product.id && isPlain(i));
    if (same) get().updateQuantity(same.id, same.quantity + 1);
    else get().addItem({ product, variation: null, quantity: 1, removedIngredients: [], addedExtras: [], selections: {}, selectionLabels: {}, note: null });
  },

  replaceItem: (itemId, { note, ...rest }) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? { ...i, ...rest, note: cleanNote(note) } : i)),
    }));
  },

  restoreItem: (item, index) => {
    set((state) => {
      if (state.items.some((i) => i.id === item.id)) return state;
      const items = [...state.items];
      items.splice(Math.min(Math.max(index, 0), items.length), 0, item);
      return { items };
    });
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

  setPaymentMethod: (method) => {
    try {
      window.localStorage.setItem(PAY_KEY, method);
    } catch {
      /* sin almacenamiento: se recuerda solo en esta sesión */
    }
    set({ paymentMethod: method });
  },

  clearCart: () => set({ items: [] }),

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
