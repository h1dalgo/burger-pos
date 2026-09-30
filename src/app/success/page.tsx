'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import SuccessScreen from '@/components/client/SuccessScreen';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const router = useRouter();

  useEffect(() => {
    if (!orderId) router.replace('/');
  }, [orderId, router]);

  if (!orderId) return null;

  return <SuccessScreen orderId={orderId} />;
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <span className="spinner" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
