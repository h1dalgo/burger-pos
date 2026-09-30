import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <h1 className="display text-3xl text-white leading-none mb-1">NUEVO PRODUCTO</h1>
      <p className="text-sm text-white/40 mb-6">Agrega un producto al menú</p>
      <ProductForm />
    </div>
  );
}
