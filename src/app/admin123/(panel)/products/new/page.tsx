import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <span className="eyebrow text-burger">Menú</span>
      <h1 className="display text-4xl text-white leading-none mt-1.5 mb-1">NUEVO PRODUCTO</h1>
      <p className="text-sm text-white/40 mb-6">Agrega un producto al menú</p>
      <ProductForm />
    </div>
  );
}
