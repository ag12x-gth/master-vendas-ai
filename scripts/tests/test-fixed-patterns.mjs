async function testFixedPatterns() {
  console.log('🧪 TESTE: Padrões Regex CORRIGIDOS\n');
  
  const testCases = [
    { text: 'Confirmo a reunião para terça às 14h', expectDetect: true, expectTime: 'terça às 14h' },
    { text: 'Pode confirmar para quinta 15h30?', expectDetect: true, expectTime: 'quinta às 15:30' },
    { text: 'Confirmado! Nos vemos sexta às 10h', expectDetect: true, expectTime: 'sexta às 10h' },
    { text: 'Vou confirmar nossa call para segunda 16:00', expectDetect: true, expectTime: 'segunda às 16:00' },
    { text: 'Confirmando o encontro quinta feira às 14h30', expectDetect: true, expectTime: 'quinta às 14:30' },
    { text: 'Confirma que vai ser quarta às 9h?', expectDetect: true, expectTime: 'quarta às 9h' },
    { text: 'Ótimo! Confirmo nossa call no Google Meet quinta-feira às 14h30', expectDetect: true, expectTime: 'quinta às 14:30' },
    // Casos negativos
    { text: 'Vou enviar 3 propostas amanhã', expectDetect: false, expectTime: '' },
    { text: 'Precisamos de 15 unidades', expectDetect: false, expectTime: '' },
  ];
  
  // Padrões atualizados
  const weekdayPattern = '(?:segunda|ter[cç]a(?:-?feira)?|quarta(?:-?feira)?|quinta(?:-?feira)?|sexta(?:-?feira)?|s[áa]bado|domingo)';
  const meetingKeywords = /\b(reuni[aã]o|meeting|meet|call|chamada|liga[çc][aã]o|videochamada|videoconfer[eê]ncia|video.?call|zoom|google.?meet|teams|conversa.?online)\b/i;
  const confirmPattern = /\b(agendar|marcar|encontro|confirm(?:ar|o|a|ando)|confirmado|bate.?papo presencial|conversar pessoalmente|marcar.?um.?hor[áa]rio)\b/i;
  
  // Padrão de extração melhorado
  const weekdayExtractPattern = '(segunda|ter[cç]a(?:-?feira)?|quarta(?:-?feira)?|quinta(?:-?feira)?|sexta(?:-?feira)?|s[áa]bado|domingo)';
  const dayFirstPattern = new RegExp(`\\b${weekdayExtractPattern}[\\s,]*(?:[aà]s?)?\\s*(\\d{1,2}(?:h(?:\\d{1,2})?|: ?\\d{2})(?:hs?|min)?)\\b`, 'i');
  
  const normalizeTime = (timeStr) => {
    let cleaned = timeStr.toLowerCase().trim();
    cleaned = cleaned.replace(/hs\b/g, 'h');
    cleaned = cleaned.replace(/min$/g, '').trim();
    cleaned = cleaned.replace(/(\d{1,2})h(\d{1,2})/, (_, h, m) => {
      return m === '00' || m === '0' ? `${h}h` : `${h}:${m.padStart(2, '0')}`;
    });
    cleaned = cleaned.replace(/:(\d{2})h$/, ':$1');
    return cleaned;
  };
  
  console.log('📋 RESULTADOS DOS TESTES:\n');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const tc of testCases) {
    const text = tc.text.toLowerCase();
    const hasKeyword = meetingKeywords.test(text) || confirmPattern.test(text);
    
    let timeMatch = null;
    const match = text.match(dayFirstPattern);
    if (match && match[1] && match[2] && (match[2].includes('h') || match[2].includes(':'))) {
      const dayName = match[1].replace(/-?feira/i, '').trim();
      timeMatch = `${dayName} às ${normalizeTime(match[2])}`;
    }
    
    const detected = hasKeyword && (tc.expectDetect ? true : false);
    const timePassed = !tc.expectTime || timeMatch === tc.expectTime;
    const passed = (detected === tc.expectDetect) && timePassed;
    
    if (passed) passCount++;
    else failCount++;
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} "${tc.text}"`);
    console.log(`   └─ Detecção: ${hasKeyword ? '✅' : '❌'} (esperado: ${tc.expectDetect ? 'SIM' : 'NÃO'})`);
    console.log(`   └─ Horário: ${timeMatch || 'N/A'} (esperado: "${tc.expectTime || 'N/A'}")`);
    console.log('');
  }
  
  console.log(`\n📊 RESUMO: ${passCount} ✅ | ${failCount} ❌\n`);
  
  if (failCount === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM!\n');
  } else {
    console.log('⚠️ Alguns testes falharam. Revisar padrões.\n');
  }
}

testFixedPatterns().catch(console.error);
