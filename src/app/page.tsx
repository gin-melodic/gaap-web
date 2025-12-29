'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/context/GlobalContext';

export default function Home() {
  const { isLoggedIn } = useGlobal();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  return null;
}
