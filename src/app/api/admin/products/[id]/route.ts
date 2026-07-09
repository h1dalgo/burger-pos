import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { name, description, basePrice, categoryId, imageUrl, hasVariation, variations, defaultIngredients, extraIngredients, requiredSelections } = body;

    await prisma.productVariation.deleteMany({ where: { productId: id } });
    await prisma.defaultIngredient.deleteMany({ where: { productId: id } });
    await prisma.extraIngredient.deleteMany({ where: { productId: id } });

    const existingSelections = await prisma.requiredSelection.findMany({ where: { productId: id } });
    for (const rs of existingSelections) {
      await prisma.requiredSelectionOption.deleteMany({ where: { requiredSelectionId: rs.id } });
    }
    await prisma.requiredSelection.deleteMany({ where: { productId: id } });

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description ?? undefined,
        basePrice: basePrice ? parseFloat(basePrice) : undefined,
        categoryId: categoryId || undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
        hasVariation: hasVariation !== undefined ? hasVariation : undefined,
        variations: variations?.length
          ? { create: variations.map((v: any) => ({ name: v.name, additionalPrice: parseFloat(v.additionalPrice || 0) })) }
          : undefined,
        defaultIngredients: defaultIngredients?.length
          ? { create: defaultIngredients.map((n: string) => ({ name: n })) }
          : undefined,
        extraIngredients: extraIngredients?.length
          ? { create: extraIngredients.map((e: any) => ({ name: e.name, basePrice: parseFloat(e.basePrice || 1.0) })) }
          : undefined,
        requiredSelections: requiredSelections?.length
          ? {
              create: requiredSelections.map((rs: any) => ({
                label: rs.label,
                maxSelections: rs.maxSelections || 1,
                options: rs.options?.length
                  ? { create: rs.options.map((o: any) => ({ name: o.name, additionalPrice: parseFloat(o.additionalPrice || 0) })) }
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
    await prisma.productVariation.deleteMany({ where: { productId: id } });
    await prisma.defaultIngredient.deleteMany({ where: { productId: id } });
    await prisma.extraIngredient.deleteMany({ where: { productId: id } });

    const selections = await prisma.requiredSelection.findMany({ where: { productId: id } });
    for (const rs of selections) {
      await prisma.requiredSelectionOption.deleteMany({ where: { requiredSelectionId: rs.id } });
    }
    await prisma.requiredSelection.deleteMany({ where: { productId: id } });

    await prisma.orderItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
