import { Suspense } from 'react';
import Transactions from '@/components/features/Transactions';
import { PageLoading } from '@/components/ui/loading';

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Transactions />
    </Suspense>
  );
}
