import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'resolve') {
      const call = await prisma.tableCall.update({
        where: { id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });

      if (global.io) {
        global.io.to('waiter').emit('tableCall:resolved', call);
      }

      return NextResponse.json(call);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update call' }, { status: 500 });
  }
}
