export interface ProductVariation {
  id: string;
  name: string;
  additionalPrice: string;
}
export interface DefaultIngredient {
  id: string;
  name: string;
}
export interface ExtraIngredient {
  id: string;
  name: string;
  basePrice: string;
}
export interface SelectionOption {
  id: string;
  name: string;
  additionalPrice: string;
}
export interface RequiredSelection {
  id: string;
  label: string;
  maxSelections: number;
  options: SelectionOption[];
}
export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: string;
  imageUrl: string | null;
  hasVariation: boolean;
  isAvailable: boolean;
  variations: ProductVariation[];
  defaultIngredients: DefaultIngredient[];
  extraIngredients: ExtraIngredient[];
  requiredSelections: RequiredSelection[];
}
export interface Category {
  id: string;
  name: string;
  products: Product[];
}

export interface CartItem {
  id: string;
  product: Product;
  variation: ProductVariation | null;
  quantity: number;
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
  selections: Record<string, string[]>;
  note: string;
}

export interface TableData {
  number: string;
  status: 'empty' | 'pending' | 'preparing' | 'ready' | 'ordered';
}

export interface TableCall {
  id: string;
  tableNumber: string;
  type: 'CALL_WAITER' | 'REQUEST_BILL';
  status: string;
  createdAt: string;
}

export function calcItemPrice(item: Omit<CartItem, 'id'>): number {
  let total = Number(item.product.basePrice);
  if (item.variation) total += Number(item.variation.additionalPrice);
  for (const e of item.addedExtras) total += Number(e.basePrice);
  for (const sel of Object.values(item.selections)) {
    for (const s of sel) {
      for (const rs of item.product.requiredSelections) {
        const opt = rs.options.find((o) => o.name === s);
        if (opt) total += Number(opt.additionalPrice);
      }
    }
  }
  return total;
}
