// src/components/ia/persona-editor.tsx
'use client';

import { BehaviorSettings } from '@/components/ia/behavior-settings';
import type { Persona as Agent } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/contexts/analytics-context';
import { useState, useEffect } from 'react';

export function PersonaEditor({ persona: initialAgent }: { persona: Agent | null }) {
    const router = useRouter();
    const { trackEvent } = useAnalytics();
    
    // Estado local para gerir os dados do agente.
    const [agent, setAgent] = useState<Agent | null>(initialAgent);
    
    // Efeito para sincronizar o estado se a prop inicial mudar.
    useEffect(() => {
        setAgent(initialAgent);
    }, [initialAgent]);


    const handleSaveSuccess = (savedAgent: Agent) => {
        const isCreating = !agent?.id;
        
        // Atualiza o estado local com os dados salvos.
        setAgent(savedAgent);

        if (isCreating) {
            trackEvent('agent_created', { agentId: savedAgent.id, agentName: savedAgent.name });
            // Redireciona para a página de edição para que a URL reflita o ID do novo agente.
            router.push(`/agentes-ia/${savedAgent.id}`);
        } else {
             trackEvent('agent_updated', { agentId: savedAgent.id, agentName: savedAgent.name });
        }
    };
    
  return (
    // A view de abas foi removida para simplificar a interface e centralizar tudo.
    <BehaviorSettings persona={agent} onSaveSuccess={handleSaveSuccess} />
  );
}
