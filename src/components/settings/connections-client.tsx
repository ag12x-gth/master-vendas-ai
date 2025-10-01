

'use client';

import { PageHeader } from '@/components/page-header';
import { ConnectionsManager } from '@/components/settings/connections-manager';

export function ConnectionsClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Conexões"
        description="Adicione e gerencie suas conexões com a API do WhatsApp."
      >
      </PageHeader>
      <ConnectionsManager />
    </div>
  );
}
