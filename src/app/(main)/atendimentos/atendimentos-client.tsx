
'use client';

import { PageHeader } from '@/components/page-header';
import { InboxView } from '@/components/atendimentos/inbox-view';
import { useSearchParams } from 'next/navigation';

export function AtendimentosClient() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId') || undefined;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-shrink-0 items-center justify-between">
        <PageHeader title="Atendimentos" description="Gerencie suas conversas." />
      </div>
      {/* A div flex-1 garante que InboxView ocupe o espaço restante */}
      <div className="flex-1 min-h-0">
        <InboxView preselectedConversationId={conversationId} />
      </div>
    </div>
  );
}
