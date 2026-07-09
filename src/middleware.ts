import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.redirect(new URL(pathname.replace('/admin', '/admin123'), request.url));
  }

  if (pathname.startsWith('/admin123') && pathname !== '/admin123/login') {
    const adminAuth = request.cookies.get('admin_auth')?.value;
    if (adminAuth !== process.env.ADMIN_PIN && adminAuth !== process.env.ADMIN_PIN! + ':true') {
      return NextResponse.redirect(new URL('/admin123/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin123/:path*'],
};