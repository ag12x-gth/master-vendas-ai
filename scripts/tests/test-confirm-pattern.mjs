async function testConfirmPattern() {
  console.log('🧪 TESTE: Palavra "CONFIRMAR" + Horário\n');
  
  const testCases = [
    'Confirmo a reunião para terça às 14h',
    'Pode confirmar para quinta 15h30?',
    'Confirmado! Nos vemos sexta às 10h',
    'Vou confirmar nossa call para segunda 16:00',
    'Confirmando o encontro quinta feira às 14h30',
    'Confirma que vai ser quarta às 9h?',
  ];
  
  // Padrões de detecção de reunião (do automation-engine)
  const meetingKeywords = /\b(agendar|agendado|agendada|marcar|marcado|marcada|confirmar|confirmado|confirmada|reunião|reuniao|meet|meeting|call|chamada|ligação|ligacao|encontro|bate[-\s]?papo|conversa|zoom|teams|google\s*meet|video\s*call|sessão|sessao)\b/i;
  
  // Padrões de extração de horário (três níveis)
  const timePatterns = [
    { 
      name: 'Dia + Hora', 
      regex: /\b(segunda|terça|quarta|quinta|sexta|sábado|domingo)[\s,]*(?:feira)?[\s,]*(?:às?)?\s*(\d{1,2}(?:hs?|:\d{2})(?:h|hs|min)?)\b/i 
    },
    { 
      name: 'Hora + Dia', 
      regex: /\b(?:às?)?\s*(\d{1,2}(?:hs?|:\d{2})(?:h|hs|min)?)[\s,]*(?:na|no|em)?\s*(segunda|terça|quarta|quinta|sexta|sábado|domingo)(?:\s+feira)?\b/i 
    },
    { 
      name: 'Só Hora', 
      regex: /\b(?:às?)?\s*(\d{1,2}(?:h|hs|:\d{2})(?:min)?)\b/i 
    },
  ];
  
  console.log('📝 CASOS DE TESTE:\n');
  
  for (const text of testCases) {
    const hasKeyword = meetingKeywords.test(text);
    let timeMatch = null;
    let patternUsed = null;
    
    // Tentar extrair horário
    for (const pattern of timePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        timeMatch = match[0];
        patternUsed = pattern.name;
        break;
      }
    }
    
    const status = hasKeyword && timeMatch ? '✅' : '⚠️';
    console.log(`${status} "${text}"`);
    console.log(`   └─ Palavra-chave: ${hasKeyword ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   └─ Horário: ${timeMatch ? `✅ "${timeMatch}" (${patternUsed})` : '❌ NÃO DETECTADO'}`);
    console.log('');
  }
  
  console.log('\n✨ RESUMO:');
  console.log('   • A palavra "confirmar" está nos padrões de detecção');
  console.log('   • Todos os formatos de horário devem ser extraídos');
  console.log('   • O sistema deve mover para "Call Agendada" quando ≥60% confiança\n');
}

testConfirmPattern().catch(console.error);
