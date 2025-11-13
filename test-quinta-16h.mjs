// Testar a detecção de "quinta 16h" (sem "às")
const text = 'Ok confirmado! Call quinta 16h entao'.toLowerCase();

const weekdayExtractPattern = '(segunda|ter[cç]a(?:[\\s-]?feira)?|quarta(?:[\\s-]?feira)?|quinta(?:[\\s-]?feira)?|sexta(?:[\\s-]?feira)?|s[áa]bado|domingo)';
const dayFirstPattern = new RegExp(`\\b${weekdayExtractPattern}[\\s,]*(?:[aà]s?)?\\s*(\\d{1,2}(?:h(?:\\d{1,2})?|: ?\\d{2})(?:hs?|min)?)\\b`, 'i');

const match = text.match(dayFirstPattern);

console.log('🧪 TESTE: "quinta 16h" (sem "às")\n');
console.log(`📝 Texto: "${text}"\n`);

if (match) {
  console.log('✅ MATCH ENCONTRADO:');
  console.log(`   Completo: "${match[0]}"`);
  console.log(`   Grupo 1 (dia): "${match[1]}"`);
  console.log(`   Grupo 2 (hora): "${match[2]}"`);
  
  const dayName = match[1].replace(/[\s-]?feira/i, '').trim();
  console.log(`\n📅 Horário normalizado: "${dayName} às ${match[2]}"`);
} else {
  console.log('❌ NENHUM MATCH ENCONTRADO\n');
  console.log('   O padrão não conseguiu extrair "quinta 16h"');
}
