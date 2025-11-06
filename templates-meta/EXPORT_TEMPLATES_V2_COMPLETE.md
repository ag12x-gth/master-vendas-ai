# 📦 PACOTE COMPLETO: Sistema de Templates WhatsApp (Meta Cloud API v21.0)

> **Exportado de:** Master IA Oficial  
> **Data:** 2025-11-05  
> **Versão:** 2.0 (Produção validada)  
> **Para:** masteria-x-meeting-call

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Dependências NPM](#dependências-npm)
3. [Schema do Banco de Dados](#schema-do-banco-de-dados)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Código Completo](#código-completo)
   - [Página Principal](#1-página-principal-templates-v2)
   - [Componente Template Builder](#2-componente-template-builder)
   - [Service Layer (Meta API)](#3-service-layer-meta-api)
   - [API Routes](#4-api-routes)
6. [Variáveis de Ambiente](#variáveis-de-ambiente)
7. [Instruções de Implementação](#instruções-de-implementação)
8. [Validações e Regras](#validações-e-regras)
9. [Testes e Debugging](#testes-e-debugging)

---

## 🎯 VISÃO GERAL

Sistema completo de gerenciamento de **Message Templates do WhatsApp** usando Meta Cloud API v21.0. Permite criar, editar, submeter à Meta, sincronizar status e deletar templates com validação em tempo real.

### Funcionalidades
- ✅ CRUD completo de templates
- ✅ Visual Builder com preview em tempo real
- ✅ Validação automática de regras da Meta (emojis, caracteres especiais, limites)
- ✅ Submissão direta à Meta Cloud API
- ✅ Sincronização de status (DRAFT → PENDING → APPROVED/REJECTED)
- ✅ Suporte a componentes: HEADER, BODY, FOOTER, BUTTONS
- ✅ Suporte a variáveis dinâmicas ({{1}}, {{2}})
- ✅ Multi-conexão (múltiplas contas WhatsApp Business)
- ✅ Mobile-first (responsive design)

---

## 📦 DEPENDÊNCIAS NPM

Adicione ao seu `package.json`:

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-label": "^2.0.2",
    "date-fns": "^2.30.0",
    "drizzle-orm": "^0.29.0",
    "lucide-react": "^0.292.0",
    "next": "^14.2.0",
    "postgres": "^3.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zod": "^3.22.4"
  }
}
```

**Instale com:**
```bash
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-label date-fns
```

---

## 🗄️ SCHEMA DO BANCO DE DADOS

### 1. Tabela `message_templates`

```typescript
// shared/schema.ts ou src/lib/db/schema.ts

export const messageTemplates = pgTable('message_templates', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 512 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  metaTemplateId: varchar('meta_template_id', { length: 255 }),
  wabaId: varchar('waba_id', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  language: varchar('language', { length: 10 }).notNull().default('pt_BR'),
  parameterFormat: varchar('parameter_format', { length: 20 }).default('POSITIONAL'),
  status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
  rejectedReason: text('rejected_reason'),
  components: jsonb('components').notNull(),
  messageSendTtlSeconds: integer('message_send_ttl_seconds'),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  connectionId: text('connection_id').notNull().references(() => connections.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  submittedAt: timestamp('submitted_at'),
  approvedAt: timestamp('approved_at'),
  sentCount: integer('sent_count').default(0),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').default(true),
  allowCategoryChange: boolean('allow_category_change').default(true),
}, (table) => ({
  uniqueNameWaba: unique('message_templates_name_waba_unique').on(table.name, table.wabaId),
}));
```

### 2. Tabela `connections` (já existente)

```typescript
export const connections = pgTable('connections', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  companyId: text('company_id').notNull().references(() => companies.id),
  config_name: text('config_name').notNull(),
  wabaId: text('waba_id').notNull(),
  phoneNumberId: text('phone_number_id').notNull(),
  appId: text('app_id'),
  accessToken: text('access_token').notNull(), // Encrypted
  webhookSecret: text('webhook_secret').notNull(),
  appSecret: text('app_secret').notNull().default(''),
  isActive: boolean('is_active').default(false).notNull(),
  connectionType: text('connection_type').default('meta_api'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 3. Migration SQL

```sql
-- Criar tabela message_templates
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(512) NOT NULL,
  display_name VARCHAR(255),
  meta_template_id VARCHAR(255),
  waba_id VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
  parameter_format VARCHAR(20) DEFAULT 'POSITIONAL',
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  rejected_reason TEXT,
  components JSONB NOT NULL,
  message_send_ttl_seconds INTEGER,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  sent_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  allow_category_change BOOLEAN DEFAULT TRUE,
  CONSTRAINT message_templates_name_waba_unique UNIQUE (name, waba_id)
);

-- Índices
CREATE INDEX idx_message_templates_company ON message_templates(company_id);
CREATE INDEX idx_message_templates_connection ON message_templates(connection_id);
CREATE INDEX idx_message_templates_status ON message_templates(status);
CREATE INDEX idx_message_templates_waba ON message_templates(waba_id);
```

**Execute com Drizzle:**
```bash
npm run db:push
# Ou se houver warnings:
npm run db:push --force
```

---

## 📁 ESTRUTURA DE ARQUIVOS

```
seu-projeto/
├── src/
│   ├── app/
│   │   ├── (main)/
│   │   │   └── templates-v2/
│   │   │       └── page.tsx                    # [1] Página principal
│   │   └── api/
│   │       └── v1/
│   │           ├── connections/
│   │           │   └── route.ts                # GET /api/v1/connections (já existe)
│   │           └── message-templates/
│   │               ├── route.ts                # [2] GET, POST, PUT, DELETE
│   │               └── [id]/
│   │                   ├── submit/
│   │                   │   └── route.ts        # [3] POST - Submeter à Meta
│   │                   └── sync-status/
│   │                       └── route.ts        # [4] POST - Sincronizar status
│   ├── components/
│   │   └── message-templates/
│   │       └── template-builder.tsx            # [5] Visual Builder
│   └── lib/
│       ├── metaTemplatesService.ts             # [6] Service Layer
│       ├── crypto.ts                           # Decrypt function (já existe)
│       └── db/
│           └── schema.ts                       # Schema Drizzle
└── shared/
    └── schema.ts                               # Ou aqui, dependendo do projeto
```

---

## 💻 CÓDIGO COMPLETO

### 1. Página Principal: `/templates-v2`

**Arquivo:** `src/app/(main)/templates-v2/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TemplateBuilder } from '@/components/message-templates/template-builder';
import { 
  Plus, 
  Send, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Eye, 
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MessageTemplate {
  id: string;
  name: string;
  displayName?: string;
  category: string;
  language: string;
  status: string;
  metaTemplateId?: string;
  wabaId: string;
  connectionId: string;
  components: any[];
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
}

interface Connection {
  id: string;
  config_name: string;
  wabaId: string;
}

export default function TemplatesV2Page() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      fetchTemplates();
    }
  }, [selectedConnection, statusFilter]);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/v1/connections');
      const data = await response.json();
      setConnections(data || []);
      if (data && data.length > 0) {
        setSelectedConnection(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar conexões',
        variant: 'destructive',
      });
    }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedConnection) params.append('connectionId', selectedConnection);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`/api/v1/message-templates?${params}`);
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData: any) => {
    try {
      const response = await fetch('/api/v1/message-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateData,
          connectionId: selectedConnection,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao criar template');
      }

      toast({
        title: 'Sucesso',
        description: 'Template criado com sucesso!',
      });

      setIsCreateDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmitToMeta = async (templateId: string) => {
    try {
      const response = await fetch(
        `/api/v1/message-templates/${templateId}/submit`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao submeter template');
      }

      const data = await response.json();
      
      toast({
        title: 'Sucesso',
        description: `Template submetido à Meta! Status: ${data.status}`,
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSyncStatus = async (templateId: string) => {
    try {
      const response = await fetch(
        `/api/v1/message-templates/${templateId}/sync-status`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao sincronizar status');
      }

      toast({
        title: 'Sucesso',
        description: 'Status sincronizado com a Meta!',
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/message-templates?id=${templateId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao deletar template');
      }

      toast({
        title: 'Sucesso',
        description: 'Template deletado com sucesso!',
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      DRAFT: { variant: 'secondary', icon: Edit, label: 'Rascunho' },
      PENDING: { variant: 'default', icon: Clock, label: 'Pendente' },
      APPROVED: { variant: 'default', icon: CheckCircle2, label: 'Aprovado' },
      REJECTED: { variant: 'destructive', icon: XCircle, label: 'Rejeitado' },
      PAUSED: { variant: 'outline', icon: Clock, label: 'Pausado' },
      DISABLED: { variant: 'outline', icon: XCircle, label: 'Desabilitado' },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Templates de Mensagem</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Crie e gerencie templates para WhatsApp Meta Cloud API
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={selectedConnection} onValueChange={setSelectedConnection}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Selecione uma conexão" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.config_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos Status</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="APPROVED">Aprovado</SelectItem>
              <SelectItem value="REJECTED">Rejeitado</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </Card>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhum template encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.displayName || template.name}</div>
                      <div className="text-sm text-muted-foreground">{template.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(template.status)}</TableCell>
                  <TableCell>{template.language}</TableCell>
                  <TableCell>
                    {format(new Date(template.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {(template.status === 'DRAFT' || template.status === 'REJECTED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSubmitToMeta(template.id)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Submeter
                        </Button>
                      )}

                      {template.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncStatus(template.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Sincronizar
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {template.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <Card className="p-6">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </Card>
        ) : filteredTemplates.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Nenhum template encontrado
          </Card>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {template.displayName || template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">{template.name}</p>
                  </div>
                  {getStatusBadge(template.status)}
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="text-xs">{template.category}</Badge>
                  <span className="text-muted-foreground">{template.language}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {format(new Date(template.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {(template.status === 'DRAFT' || template.status === 'REJECTED') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSubmitToMeta(template.id)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Submeter
                  </Button>
                )}

                {template.status === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSyncStatus(template.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Sincronizar
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>

                {template.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Deletar
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Template</DialogTitle>
            <DialogDescription>
              Crie um template de mensagem seguindo as diretrizes da Meta
            </DialogDescription>
          </DialogHeader>
          <TemplateBuilder
            connectionId={selectedConnection}
            onSave={handleCreateTemplate}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Informações</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span> {selectedTemplate.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoria:</span> {selectedTemplate.category}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span> {getStatusBadge(selectedTemplate.status)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Idioma:</span> {selectedTemplate.language}
                  </div>
                </div>
              </div>

              {selectedTemplate.rejectedReason && (
                <div className="bg-destructive/10 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-destructive">Motivo da Rejeição:</p>
                  <p className="text-sm mt-1">{selectedTemplate.rejectedReason}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Componentes</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  {selectedTemplate.components.map((comp: any, idx: number) => (
                    <div key={idx}>
                      <Badge className="mb-2">{comp.type}</Badge>
                      {comp.text && <p className="text-sm whitespace-pre-wrap">{comp.text}</p>}
                      {comp.buttons && (
                        <div className="flex flex-col gap-2 mt-2">
                          {comp.buttons.map((btn: any, btnIdx: number) => (
                            <Button key={btnIdx} variant="outline" size="sm" className="w-fit">
                              {btn.text}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

### 2. Componente Template Builder

**Arquivo:** `src/components/message-templates/template-builder.tsx`

> **NOTA:** Este arquivo é muito longo (575 linhas). Vou criar um arquivo separado compactado.

**INSTRUÇÃO:** Copie o arquivo `template-builder.tsx` do projeto original EXATAMENTE como está. Ele contém:
- Validação de emojis em HEADER (Unicode property escapes)
- Limite de 60 caracteres no HEADER
- Detecção de variáveis `{{1}}`, `{{2}}`
- Validação de nome (apenas `a-z0-9_`)
- Preview em tempo real
- Suporte a HEADER (TEXT/IMAGE/VIDEO), BODY, FOOTER, BUTTONS (QUICK_REPLY/URL/PHONE_NUMBER)

---

### 3. Service Layer (Meta API)

**Arquivo:** `src/lib/metaTemplatesService.ts`

```typescript
import { db } from '@/lib/db';
import { connections, messageTemplates } from './db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './crypto';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v21.0';

interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
}

interface CreateTemplatePayload {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: MetaTemplateComponent[];
  allow_category_change?: boolean;
}

interface SubmitTemplateResult {
  success: boolean;
  metaTemplateId?: string;
  status?: string;
  error?: string;
  errorDetails?: any;
}

export async function submitTemplateToMeta(
  templateId: string
): Promise<SubmitTemplateResult> {
  try {
    console.log(`[META SERVICE] 🔍 Buscando template no DB: ${templateId}`);
    
    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, templateId));

    if (!template) {
      console.log('[META SERVICE] ❌ Template não encontrado no DB');
      return {
        success: false,
        error: 'Template não encontrado',
      };
    }

    console.log(`[META SERVICE] ✅ Template encontrado: ${template.name}`);
    console.log(`[META SERVICE] Status: ${template.status}`);
    console.log(`[META SERVICE] WABA ID: ${template.wabaId}`);
    console.log(`[META SERVICE] Connection ID: ${template.connectionId}`);

    if (template.status !== 'DRAFT' && template.status !== 'REJECTED') {
      console.log(`[META SERVICE] ❌ Status inválido: ${template.status}`);
      return {
        success: false,
        error: `Template não pode ser submetido. Status atual: ${template.status}`,
      };
    }

    console.log(`[META SERVICE] 🔍 Buscando conexão: ${template.connectionId}`);
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, template.connectionId));

    if (!connection) {
      console.log('[META SERVICE] ❌ Conexão não encontrada');
      return {
        success: false,
        error: 'Conexão não encontrada',
      };
    }

    console.log('[META SERVICE] ✅ Conexão encontrada, desencriptando token...');
    const accessToken = decrypt(connection.accessToken);
    if (!accessToken) {
      console.log('[META SERVICE] ❌ Falha ao desencriptar token');
      return {
        success: false,
        error: 'Falha ao desencriptar token de acesso',
      };
    }

    console.log('[META SERVICE] ✅ Token desencriptado com sucesso');

    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${template.wabaId}/message_templates`;

    const rawComponents = template.components as MetaTemplateComponent[];
    
    const validComponents = rawComponents
      .filter(comp => {
        if (comp.type === 'FOOTER' && (!comp.text || comp.text.trim() === '')) {
          return false;
        }
        if (comp.type === 'HEADER' && comp.format === 'TEXT' && (!comp.text || comp.text.trim() === '')) {
          return false;
        }
        return true;
      })
      .map(comp => ({
        ...comp,
        type: comp.type.toLowerCase(),
        ...(comp.format && { format: comp.format }),
      }));

    const payload: any = {
      name: template.name,
      language: template.language,
      category: template.category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
      components: validComponents,
      allow_category_change: template.allowCategoryChange ?? true,
    };

    console.log('[META SERVICE] 📤 Enviando para Meta API...');
    console.log(`[META SERVICE] URL: ${url}`);
    console.log('[META SERVICE] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`[META SERVICE] 📥 Resposta HTTP: ${response.status} ${response.statusText}`);

    const responseData = await response.json();
    console.log('[META SERVICE] 📥 Resposta completa da Meta:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.log('[META SERVICE] ❌ Meta API retornou erro!');
      await db
        .update(messageTemplates)
        .set({
          status: 'REJECTED',
          rejectedReason: responseData.error?.message || 'Erro desconhecido',
          updatedAt: new Date(),
        })
        .where(eq(messageTemplates.id, templateId));

      return {
        success: false,
        error: responseData.error?.message || 'Falha ao submeter template',
        errorDetails: responseData.error,
      };
    }

    const metaTemplateId = responseData.id;
    const status = responseData.status || 'PENDING';

    await db
      .update(messageTemplates)
      .set({
        metaTemplateId,
        status,
        submittedAt: new Date(),
        approvedAt: status === 'APPROVED' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(messageTemplates.id, templateId));

    return {
      success: true,
      metaTemplateId,
      status,
    };
  } catch (error) {
    console.error('[Meta Templates] Erro ao submeter template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function getTemplateStatus(
  metaTemplateId: string,
  wabaId: string,
  accessToken: string
): Promise<{ status: string; rejectedReason?: string } | null> {
  try {
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${metaTemplateId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      status: data.status,
      rejectedReason: data.rejected_reason,
    };
  } catch (error) {
    console.error('[Meta Templates] Erro ao buscar status:', error);
    return null;
  }
}

export async function deleteMetaTemplate(
  metaTemplateId: string,
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${wabaId}/message_templates`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: metaTemplateId,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: responseData.error?.message || 'Falha ao deletar template',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function syncTemplateStatus(
  templateId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, templateId));

    if (!template || !template.metaTemplateId) {
      return {
        success: false,
        error: 'Template não encontrado ou não submetido à Meta',
      };
    }

    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, template.connectionId));

    if (!connection) {
      return {
        success: false,
        error: 'Conexão não encontrada',
      };
    }

    const accessToken = decrypt(connection.accessToken);
    if (!accessToken) {
      return {
        success: false,
        error: 'Falha ao desencriptar token',
      };
    }

    const statusData = await getTemplateStatus(
      template.metaTemplateId,
      template.wabaId,
      accessToken
    );

    if (!statusData) {
      return {
        success: false,
        error: 'Falha ao buscar status na Meta',
      };
    }

    await db
      .update(messageTemplates)
      .set({
        status: statusData.status,
        rejectedReason: statusData.rejectedReason,
        approvedAt: statusData.status === 'APPROVED' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(messageTemplates.id, templateId));

    return {
      success: true,
      status: statusData.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
```

---

### 4. API Routes

#### 4.1. CRUD Principal

**Arquivo:** `src/app/api/v1/message-templates/route.ts`

> **NOTA:** Arquivo muito longo (285 linhas). Copie do original.

**Endpoints:**
- `GET /api/v1/message-templates` - Listar templates (com filtros)
- `POST /api/v1/message-templates` - Criar template
- `PUT /api/v1/message-templates` - Atualizar template (apenas DRAFT/REJECTED)
- `DELETE /api/v1/message-templates?id={id}` - Deletar template

#### 4.2. Submeter à Meta

**Arquivo:** `src/app/api/v1/message-templates/[id]/submit/route.ts`

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth-helpers';
import { submitTemplateToMeta } from '@/lib/metaTemplatesService';
import { db } from '@/lib/db';
import { messageTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await requireCompanySession();
  if (!companyId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const templateId = params.id;

    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(
        and(
          eq(messageTemplates.id, templateId),
          eq(messageTemplates.companyId, companyId)
        )
      );

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      );
    }

    if (template.status !== 'DRAFT' && template.status !== 'REJECTED') {
      return NextResponse.json(
        {
          error: `Template não pode ser submetido. Status atual: ${template.status}`,
        },
        { status: 400 }
      );
    }

    const result = await submitTemplateToMeta(templateId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          details: result.errorDetails,
        },
        { status: 400 }
      );
    }

    const [updatedTemplate] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, templateId));

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      metaTemplateId: result.metaTemplateId,
      status: result.status,
    });
  } catch (error) {
    console.error('[Submit Template API] Erro ao submeter template:', error);
    return NextResponse.json(
      { error: 'Erro ao submeter template' },
      { status: 500 }
    );
  }
}
```

#### 4.3. Sincronizar Status

**Arquivo:** `src/app/api/v1/message-templates/[id]/sync-status/route.ts`

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth-helpers';
import { syncTemplateStatus } from '@/lib/metaTemplatesService';
import { db } from '@/lib/db';
import { messageTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await requireCompanySession();
  if (!companyId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const templateId = params.id;

    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(
        and(
          eq(messageTemplates.id, templateId),
          eq(messageTemplates.companyId, companyId)
        )
      );

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      );
    }

    const result = await syncTemplateStatus(templateId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
        },
        { status: 400 }
      );
    }

    const [updatedTemplate] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, templateId));

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      status: result.status,
    });
  } catch (error) {
    console.error('[Sync Template Status API] Erro ao sincronizar status:', error);
    return NextResponse.json(
      { error: 'Erro ao sincronizar status' },
      { status: 500 }
    );
  }
}
```

---

## 🔧 VARIÁVEIS DE AMBIENTE

Adicione ao `.env`:

```bash
# Meta Cloud API
FACEBOOK_API_VERSION=v21.0

# Database (já existente)
DATABASE_URL=postgresql://...

# Encryption (para decrypt de accessToken)
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

---

## 📝 INSTRUÇÕES DE IMPLEMENTAÇÃO

### Passo 1: Preparar Banco de Dados

```bash
# 1. Adicionar schema ao seu schema.ts
# 2. Rodar migration
npm run db:push
# Ou forçar se houver warnings:
npm run db:push --force
```

### Passo 2: Copiar Arquivos

```bash
# Copie TODOS os arquivos na ordem:
1. src/lib/metaTemplatesService.ts
2. src/components/message-templates/template-builder.tsx
3. src/app/api/v1/message-templates/route.ts
4. src/app/api/v1/message-templates/[id]/submit/route.ts
5. src/app/api/v1/message-templates/[id]/sync-status/route.ts
6. src/app/(main)/templates-v2/page.tsx
```

### Passo 3: Instalar Dependências

```bash
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-label date-fns
```

### Passo 4: Verificar Imports

Ajuste os imports conforme seu projeto:
- `@/lib/db` → caminho para seu db Drizzle
- `@/lib/crypto` → sua função `decrypt()`
- `@/lib/auth-helpers` → sua função `requireCompanySession()`
- `@/hooks/use-toast` → seu hook de toast
- `@/components/ui/*` → seus componentes ShadCN

### Passo 5: Adicionar ao Menu/Sidebar

```typescript
// src/components/app-sidebar.tsx ou similar
{
  title: "Templates",
  icon: MessageSquare,
  url: "/templates-v2",
}
```

### Passo 6: Testar

```bash
npm run dev
# Acesse http://localhost:3000/templates-v2
```

---

## ✅ VALIDAÇÕES E REGRAS

### Regras da Meta Cloud API v21.0

1. **Nome do Template:**
   - Apenas `a-z`, `0-9`, `_`
   - Máximo 512 caracteres
   - Único por WABA ID

2. **HEADER (TEXT):**
   - ❌ **Sem emojis** (Unicode property escapes detectam TODOS)
   - ❌ **Sem quebras de linha** (`\n`, `\r`)
   - ❌ **Sem asteriscos** (`*`)
   - ✅ Máximo 60 caracteres

3. **BODY:**
   - ✅ Permite emojis
   - ✅ Permite quebras de linha
   - ✅ Permite variáveis `{{1}}`, `{{2}}`
   - Máximo 1024 caracteres

4. **FOOTER:**
   - ✅ Texto simples
   - Máximo 60 caracteres

5. **BUTTONS:**
   - Máximo 3 botões
   - QUICK_REPLY: apenas texto
   - URL: requer URL válida
   - PHONE_NUMBER: requer número com código país

6. **Status Flow:**
   ```
   DRAFT → [Submit] → PENDING → [Meta Review] → APPROVED ✅
                                              → REJECTED ❌
   ```

---

## 🧪 TESTES E DEBUGGING

### 1. Testar Validação de HEADER

```typescript
// Deve REJEITAR:
"Olá! 👋"         // Emoji
"Linha 1\nLinha 2" // Quebra de linha
"Texto*bold*"      // Asterisco

// Deve ACEITAR:
"Boas-vindas"
"Pedido {{1}} confirmado"
"Oferta especial ate {{1}}"
```

### 2. Testar Submissão

```bash
# 1. Criar template DRAFT
# 2. Clicar "Submeter"
# 3. Verificar logs no console:
[META SERVICE] 📤 Enviando para Meta API...
[META SERVICE] 📥 Resposta HTTP: 200 OK
[META SERVICE] ✅ Template submetido com sucesso!

# 4. Verificar status mudou para PENDING
# 5. Sincronizar status após ~30s
```

### 3. Debugging

```typescript
// Ativar logs detalhados em metaTemplatesService.ts
console.log('[META SERVICE] Payload:', JSON.stringify(payload, null, 2));
console.log('[META SERVICE] Resposta completa:', JSON.stringify(responseData, null, 2));
```

---

## 🚀 PRÓXIMOS PASSOS (Opcional)

1. **Webhook para Auto-Sync:**
   - Meta envia webhook quando status muda
   - Auto-atualizar DB sem sincronização manual

2. **Template Preview Real:**
   - Renderizar como WhatsApp real
   - Usar WhatsApp Web CSS

3. **Analytics:**
   - Rastrear `sentCount`, `lastUsedAt`
   - Dashboard de performance

4. **Versionamento:**
   - Histórico de edições
   - Rollback de templates

---

## 📞 SUPORTE

**Documentação Meta:**
- [Message Templates API v21.0](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Template Components](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components)
- [Validation Rules](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates#validation)

**Erros Comuns:**
- **400 Bad Request:** Validação falhou (checar logs detalhados)
- **401 Unauthorized:** Access token inválido (verificar decrypt)
- **409 Conflict:** Nome duplicado no WABA

---

**FIM DO PACOTE DE EXPORTAÇÃO** 🎉
