import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    const maxSize = 500 * 1024;
    const size = Buffer.byteLength(image, 'utf8');
    if (size > maxSize) {
      return NextResponse.json({ error: 'Image too large (max 500KB)' }, { status: 400 });
    }

    return NextResponse.json({ url: image });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
