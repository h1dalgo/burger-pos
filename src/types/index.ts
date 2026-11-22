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
  /** Destacado en el escaparate de arriba del menú. */
  isFeatured?: boolean;
  /** Alérgenos que contiene ("Gluten", "Lácteos"...). */
  allergens?: string[];
  /** Agotado porque se acabó un insumo del inventario. */
  outOfStock?: boolean;
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
  selectionLabels?: Record<string, string>;
  note?: string | null;
}

export type OrderStatus = 'WAITING_PAYMENT' | 'PENDING' | 'IN_PREPARATION' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'MOBILE_PAYMENT' | 'CARD';

export interface Order {
  id: string;
  displayId: number;
  customerName: string;
  tableNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  tip?: number;
  waiter?: string | null;
  /** Referencia del Pago Móvil */
  paymentReference?: string | null;
  discount?: number;
  promoLabel?: string | null;
  /** Tasa Bs/$ del momento del pedido */
  exchangeRate?: number | null;
  rating?: number | null;
  ratingComment?: string | null;
  cancelReason?: string | null;
  /** Recibo digital (se asigna al confirmarse el pago) */
  receiptNumber?: number | null;
  paidAt?: string | null;
  /** Quién confirmó el pago (mesero o Admin). */
  paidBy?: string | null;
  /** Quién canceló el pedido. */
  cancelledBy?: string | null;
  customerDoc?: string | null;
  /** Correo enmascarado (solo en el recibo) */
  maskedEmail?: string | null;
  receiptSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  note: string | null;
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

export type TableCallType = 'CALL_WAITER' | 'REQUEST_BILL';
export type TableCallStatus = 'ACTIVE' | 'RESOLVED';

export interface TableCall {
  id: string;
  tableNumber: string;
  type: TableCallType;
  status: TableCallStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface BusinessSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  tableCount: number;
  exchangeRate: number;
  rateUpdatedAt: string | null;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  timezone: string;
  pagoMovilBank: string | null;
  pagoMovilPhone: string | null;
  pagoMovilId: string | null;
  legalName?: string | null;
  rif?: string | null;
  address?: string | null;
  phone?: string | null;
  taxRate?: number;
  receiptFooter?: string | null;
}

/** Ajustes públicos que recibe el cliente (/api/settings). */
export interface PublicSettings extends BusinessSettings {
  /** ¿Se reciben pedidos ahora? */
  open: boolean;
  message: string | null;
  promotions: { id: string; name: string; type: 'PERCENT' | 'FIXED'; value: number; categoryId: string | null; minTotal: number }[];
}
