import { NextResponse } from 'next/server';
import { currentPromotions, getSettings, openState } from '@/lib/business';

export const runtime = 'nodejs';

/** Ajustes públicos: nombre, logo, tasa del día, horario y promociones vigentes. */
export async function GET() {
  try {
    const s = await getSettings();
    const promos = await currentPromotions(s.timezone);
    return NextResponse.json(
      {
        ...s,
        exchangeRate: Number(s.exchangeRate),
        taxRate: Number(s.taxRate),
        ...openState(s),
        promotions: promos.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          value: Number(p.value),
          categoryId: p.categoryId,
          minTotal: Number(p.minTotal),
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ name: 'Burger POS', logoUrl: null, exchangeRate: 0, open: true, message: null, promotions: [] });
  }
}
