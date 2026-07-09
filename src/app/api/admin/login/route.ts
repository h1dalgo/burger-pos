import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { pin } = await request.json();
  const adminPin = process.env.ADMIN_PIN || '1234';

  if (pin === adminPin) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_auth', pin + ':true', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  }

  return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
}
