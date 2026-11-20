import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const cleanAllergens = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, 30)))].slice(0, 15) : undefined);

/** Datos del formulario de productos (los precios pueden llegar como texto o número). */
type PriceInput = string | number | null | undefined;
interface VariationInput { name: string; additionalPrice?: PriceInput }
interface ExtraInput { name: string; basePrice?: PriceInput }
interface OptionInput { name: string; additionalPrice?: PriceInput }
interface SelectionInput { label: string; maxSelections?: PriceInput; options?: OptionInput[] }
const toPrice = (v: PriceInput, fallback: number) => parseFloat(String(v || fallback));

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        variations: true,
        defaultIngredients: true,
        extraIngredients: true,
        requiredSelections: { include: { options: true } },
      },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, description, basePrice, categoryId, imageUrl, hasVariation, isFeatured, allergens, variations, defaultIngredients, extraIngredients, requiredSelections } = body;

    const product = await prisma.$transaction(async (tx) => {
      await tx.productVariation.deleteMany({ where: { productId: id } });
      await tx.defaultIngredient.deleteMany({ where: { productId: id } });
      await tx.extraIngredient.deleteMany({ where: { productId: id } });

      const existingSelections = await tx.requiredSelection.findMany({ where: { productId: id } });
      for (const rs of existingSelections) {
        await tx.requiredSelectionOption.deleteMany({ where: { requiredSelectionId: rs.id } });
      }
      await tx.requiredSelection.deleteMany({ where: { productId: id } });

      return tx.product.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description ?? undefined,
          basePrice: basePrice ? parseFloat(basePrice) : undefined,
          categoryId: categoryId || undefined,
          imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
          hasVariation: hasVariation !== undefined ? hasVariation : undefined,
          isFeatured: typeof isFeatured === 'boolean' ? isFeatured : undefined,
          allergens: cleanAllergens(allergens),
          variations: variations?.length
            ? { create: variations.map((v: VariationInput) => ({ name: v.name, additionalPrice: toPrice(v.additionalPrice, 0) })) }
            : undefined,
          defaultIngredients: defaultIngredients?.length
            ? { create: defaultIngredients.map((n: string) => ({ name: n })) }
            : undefined,
          extraIngredients: extraIngredients?.length
            ? { create: extraIngredients.map((e: ExtraInput) => ({ name: e.name, basePrice: toPrice(e.basePrice, 1.0) })) }
            : undefined,
          requiredSelections: requiredSelections?.length
            ? {
                create: requiredSelections.map((rs: SelectionInput) => ({
                  label: rs.label,
                  maxSelections: Number(rs.maxSelections) || 1,
                  options: rs.options?.length
                    ? { create: rs.options.map((o: OptionInput) => ({ name: o.name, additionalPrice: toPrice(o.additionalPrice, 0) })) }
                    : undefined,
                })),
              }
            : undefined,
        },
        include: {
          variations: true,
          defaultIngredients: true,
          extraIngredients: true,
          requiredSelections: { include: { options: true } },
        },
      });
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
