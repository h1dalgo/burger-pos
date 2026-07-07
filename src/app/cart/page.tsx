'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/menu');
  }, [router]);

  return null;
}
