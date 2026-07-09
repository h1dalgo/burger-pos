import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: { name: 'Burger POS', logoUrl: null },
      });
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ name: 'Burger POS', logoUrl: null });
  }
}
