
// src/app/(main)/atendimentos/page.tsx

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AtendimentosClient } from './atendimentos-client';

function Loading() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-shrink-0 items-center justify-between">
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="h-full flex-1 grid grid-cols-1 md:grid-cols-[minmax(300px,_1fr)_3fr] xl:grid-cols-[minmax(320px,_1fr)_2fr_1fr] border rounded-lg overflow-hidden">
        {/* Coluna da Lista de Conversas (Skeleton) */}
        <div className="h-full border-r p-4 space-y-2 hidden md:block">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
        {/* Coluna do Chat Ativo (Skeleton) */}
        <div className="h-full flex border-r p-4 flex-col gap-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="flex-1 space-y-4">
                 <Skeleton className="h-12 w-3/4" />
                 <Skeleton className="h-12 w-3/4 ml-auto" />
            </div>
        </div>
         {/* Coluna de Detalhes (Skeleton) */}
        <div className="h-full hidden xl:flex p-4 flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function AtendimentosPage() {
  return (
    <div className="h-full">
        <Suspense fallback={<Loading />}>
            <AtendimentosClient />
        </Suspense>
    </div>
  );
}
