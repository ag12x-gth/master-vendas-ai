import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function test() {
  console.log('🧪 TESTE SIMPLIFICADO: Verificando sistema de detecção\n');
  
  // Simular detecção de reunião
  const text = 'Ótimo! Confirmo nossa call no Google Meet quinta às 14h30';
  
  console.log(`📝 Texto de teste: "${text}"\n`);
  
  // Padrões que devem ser detectados (das melhorias implementadas)
  const patterns = {
    'Google Meet': /google.?meet/i.test(text),
    'Call': /\b(call|chamada)\b/i.test(text),
    'Quinta-feira': /\b(quinta)\b/i.test(text),
    'Horário 14h30': /14h30|14:30/.test(text),
  };
  
  console.log('✅ PADRÕES DETECTADOS:\n');
  for (const [name, detected] of Object.entries(patterns)) {
    console.log(`  ${detected ? '✅' : '❌'} ${name}: ${detected ? 'SIM' : 'NÃO'}`);
  }
  
  // Simular extração de horário
  const timePatterns = [
    { name: 'Dia + Hora', regex: /\b(segunda|terça|quarta|quinta|sexta|sábado|domingo)[\s,]*(?:às?)?\s*(\d{1,2}(?:hs|h\d{0,2}|:\d{2}(?:hs?)?)(?:min)?)\b/i },
    { name: 'Hora + Dia', regex: /\b(?:às?)?\s*(\d{1,2}(?:hs|h\d{0,2}|:\d{2}(?:hs?)?)(?:min)?)[\s,]*(?:na|no|em)?\s*(segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/i },
    { name: 'Só Hora', regex: /\b(?:às?)?\s*(\d{1,2}(?:hs|h\d{0,2}|:\d{2}(?:hs?)?)(?:min)?)\b/i },
  ];
  
  console.log('\n🔍 EXTRAÇÃO DE HORÁRIO:\n');
  for (const pattern of timePatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      console.log(`  ✅ ${pattern.name}: "${match[0]}"`);
      console.log(`     → Grupos: [${match.slice(1).filter(Boolean).join(', ')}]`);
      break;
    }
  }
  
  console.log('\n✨ Teste concluído!\n');
  console.log('💡 O sistema deve:');
  console.log('   1. Detectar "Google Meet" como palavra-chave de reunião');
  console.log('   2. Extrair "quinta às 14h30"');
  console.log('   3. Mover lead para stage "Call Agendada"');
  console.log('   4. Mostrar badge "📅 Reunião agendada: quinta às 14:30"\n');
}

test().catch(console.error);
