import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Datos del formulario de productos (los precios pueden llegar como texto o número). */
type PriceInput = string | number | null | undefined;
interface VariationInput { name: string; additionalPrice?: PriceInput }
interface ExtraInput { name: string; basePrice?: PriceInput }
interface OptionInput { name: string; additionalPrice?: PriceInput }
interface SelectionInput { label: string; maxSelections?: PriceInput; options?: OptionInput[] }
const toPrice = (v: PriceInput, fallback: number) => parseFloat(String(v || fallback));

export const runtime = 'nodejs';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        variations: true,
        defaultIngredients: true,
        extraIngredients: true,
        requiredSelections: { include: { options: true } },
      },
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, basePrice, categoryId, imageUrl, hasVariation, isFeatured, variations, defaultIngredients, extraIngredients, requiredSelections } = body;

    if (!name || !basePrice || !categoryId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        basePrice: parseFloat(basePrice),
        categoryId,
        imageUrl: imageUrl || null,
        hasVariation: hasVariation || false,
        isFeatured: isFeatured === true,
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

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
