import { Suspense } from 'react';
import Ops from '@/components/features/Ops';
import { PageLoading } from '@/components/ui/loading';

// Admin ops console. Mounted under a random path segment (NEXT_PUBLIC_OPS_CODE)
// so it is not guessable from the URL; robots.txt disallows it.
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Ops />
    </Suspense>
  );
}
