import { Suspense } from 'react';
import Accounts from '@/components/features/Accounts';
import { PageLoading } from '@/components/ui/loading';

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Accounts />
    </Suspense>
  );
}
