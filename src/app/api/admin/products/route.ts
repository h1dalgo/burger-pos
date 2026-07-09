import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { name, description, basePrice, categoryId, imageUrl, hasVariation, variations, defaultIngredients, extraIngredients, requiredSelections } = body;

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

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
