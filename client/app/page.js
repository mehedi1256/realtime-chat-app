'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';

export default function Home() {
  const router = useRouter();
  const hasHydrated = useStore((s) => s.hasHydrated);
  const token = useStore((s) => s.token);

  useEffect(() => {
    if (!hasHydrated) return;
    if (token) {
      router.replace('/chat');
    } else {
      router.replace('/login');
    }
  }, [hasHydrated, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
    </div>
  );
}
