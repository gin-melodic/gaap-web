import { Suspense } from 'react';
import Dashboard from '@/components/features/Dashboard';
import { PageLoading } from '@/components/ui/loading';

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Dashboard />
    </Suspense>
  );
}
