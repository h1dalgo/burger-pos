import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { pin } = await request.json();
  const adminPin = process.env.ADMIN_PIN || '1234';

  if (pin === adminPin) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
}
