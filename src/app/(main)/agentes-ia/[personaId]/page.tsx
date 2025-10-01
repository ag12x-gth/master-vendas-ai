// src/app/(main)/ia/[personaId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PersonaEditor } from '@/components/ia/persona-editor';
import type { Persona } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function EditPersonaPage({ params }: { params: { personaId: string } }) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { personaId } = params;

  useEffect(() => {
    if (!personaId) return;

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

    fetchPersona();
  }, [personaId, toast]);

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

      <PersonaEditor persona={persona} />
    </div>
  );
}
