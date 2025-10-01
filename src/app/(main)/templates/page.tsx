import { TemplateGrid } from '@/components/templates/template-grid';
import { PageHeader } from '@/components/page-header';

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Modelos"
          description="Gerencie e visualize seus modelos de mensagem aprovados pela Meta."
        />
      </div>
      <TemplateGrid />
    </div>
  );
}
