'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import SuccessScreen from '@/components/client/SuccessScreen';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';

  if (!orderId) {
    const router = useRouter();
    router.push('/');
    return null;
  }

  return <SuccessScreen orderId={orderId} />;
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
