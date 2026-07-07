export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  products: Product[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  hasVariation: boolean;
  variations: ProductVariation[];
  defaultIngredients: DefaultIngredient[];
  extraIngredients: ExtraIngredient[];
  requiredSelections: RequiredSelection[];
}

export interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  additionalPrice: number;
  isAvailable: boolean;
}

export interface RequiredSelection {
  id: string;
  productId: string;
  label: string;
  maxSelections: number;
  options: RequiredSelectionOption[];
}

export interface RequiredSelectionOption {
  id: string;
  requiredSelectionId: string;
  name: string;
  additionalPrice: number;
  isAvailable: boolean;
}

export interface DefaultIngredient {
  id: string;
  productId: string;
  name: string;
}

export interface ExtraIngredient {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
  isAvailable: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  variation: ProductVariation | null;
  quantity: number;
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
  selections: Record<string, string[]>;
}

export type OrderStatus = 'PENDING' | 'IN_PREPARATION' | 'READY' | 'DELIVERED';
export type PaymentMethod = 'CASH' | 'MOBILE_PAYMENT' | 'CARD';

export interface Order {
  id: string;
  displayId: number;
  customerName: string;
  tableNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variation: { variationName: string; additionalPrice: number } | null;
  removedIngredients: { ingredientName: string }[];
  addedExtras: { extraName: string; price: number }[];
  selections: { selectionLabel: string; selectedOptionName: string }[];
}

export interface SocketEvents {
  'order:new': (order: Order) => void;
  'order:updated': (order: Order) => void;
  'order:archived': (orderId: string) => void;
  'stock:updated': (data: StockUpdate) => void;
}

export interface StockUpdate {
  type: 'product' | 'variation' | 'option' | 'extra';
  id: string;
  isAvailable: boolean;
  productId?: string;
}
