import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, logoUrl, tableCount } = body;

    const existing = await prisma.businessSettings.findFirst();

    let settings;
    if (existing) {
      settings = await prisma.businessSettings.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { name }),
          ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
          ...(tableCount !== undefined && { tableCount }),
        },
      });
    } else {
      settings = await prisma.businessSettings.create({
        data: { name: name || 'Burger POS', logoUrl: logoUrl || null, tableCount: tableCount || 10 },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
