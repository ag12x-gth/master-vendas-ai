// src/app/(main)/ia/[personaId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PersonaEditor } from '@/components/ia/persona-editor';
import { PersonaMetrics } from '@/components/ia/persona-metrics';
import { AgentTestChat } from '@/components/ia/agent-test-chat';
import { RagSectionsManager } from '@/components/ia/rag-sections-manager';
import type { Persona } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EditPersonaPage({ params }: { params: { personaId: string } }) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();
  const { personaId } = params;

  const fetchPersona = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/ia/personas/${personaId}`);
      if (!response.ok) {
          if (response.status === 404) notFound();
          throw new Error('Falha ao carregar os dados do agente.');
      }
      const data = await response.json();
      setPersona(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!personaId) return;
    fetchPersona();
  }, [personaId, refreshTrigger, toast]);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!persona) {
    // A função notFound() será chamada dentro do useEffect se a resposta for 404.
    // Este é um fallback caso algo inesperado ocorra.
    return <div>Agente não encontrado.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar Agente: ${persona.name}`}
        description="Ajuste o comportamento e o conhecimento do seu assistente virtual."
      >
         <Link href="/agentes-ia" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Agentes
          </Button>
        </Link>
      </PageHeader>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-[800px]">
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="sections">Seções RAG</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="test">Testar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="space-y-6 mt-6">
          <PersonaEditor 
            persona={persona} 
            onSaveSuccess={() => {
              // Recarrega dados após salvar para sincronizar estado
              setRefreshTrigger(prev => prev + 1);
            }} 
          />
        </TabsContent>
        
        <TabsContent value="sections" className="space-y-6 mt-6">
          <RagSectionsManager personaId={personaId} />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6 mt-6">
          <PersonaMetrics personaId={personaId} />
        </TabsContent>
        
        <TabsContent value="test" className="mt-6">
          <div className="h-[calc(100vh-300px)] min-h-[600px]">
            <AgentTestChat personaId={personaId} personaName={persona.name} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
