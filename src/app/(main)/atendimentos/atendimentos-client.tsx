
'use client';

import { PageHeader } from '@/components/page-header';
import { InboxView } from '@/components/atendimentos/inbox-view';
import { useSearchParams } from 'next/navigation';

export function AtendimentosClient() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId') || undefined;

  return (
    <div className="flex flex-col h-full min-h-0 pb-20 md:pb-0 w-full max-w-full overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between mb-3">
        <PageHeader title="Atendimentos" />
      </div>
      <div className="flex-1 min-h-0">
        <InboxView preselectedConversationId={conversationId} />
      </div>
    </div>
  );
}
