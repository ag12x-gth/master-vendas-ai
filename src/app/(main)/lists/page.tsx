
'use client';

import { ContactListsTable } from '@/components/lists/contact-lists-table';
import { PageHeader } from '@/components/page-header';

export default function ListsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Listas de Contatos"
        description="Crie e gerencie listas para segmentar seus contatos e campanhas."
      />
      <ContactListsTable />
    </div>
  );
}
