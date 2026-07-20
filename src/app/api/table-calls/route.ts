import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const calls = await prisma.tableCall.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(calls);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableNumber, type } = body;

    if (!tableNumber || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const call = await prisma.tableCall.create({
      data: { tableNumber, type },
    });

    if (global.io) {
      global.io.to('waiter').emit('tableCall:new', call);
    }

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 });
  }
}
