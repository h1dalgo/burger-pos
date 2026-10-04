import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <h1 className="display text-4xl text-carbon sign-yellow leading-none">NUEVO PRODUCTO</h1>
      <p className="text-sm text-carbon/65 mt-2 mb-6">Agrega un producto al menú</p>
      <ProductForm />
    </div>
  );
}
