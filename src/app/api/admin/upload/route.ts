import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    const maxSize = 2 * 1024 * 1024;
    const size = Buffer.byteLength(image, 'utf8');
    if (size > maxSize) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Fallback: store base64 locally if Cloudinary not configured
      return NextResponse.json({ url: image });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'burger-pos',
      transformation: [{ width: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}