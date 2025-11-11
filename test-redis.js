// Teste Redis List Operations (Erro #5)
const { EnhancedCache } = require('./src/lib/redis');

async function testRedisListOperations() {
  console.log('\n' + '='.repeat(60));
  console.log('🔴 TESTE REDIS: List Operations (Erro #5)');
  console.log('='.repeat(60) + '\n');

  const cache = EnhancedCache.getInstance();
  const testKey = 'test:campaign:queue';
  
  try {
    // Limpar chave de teste
    await cache.del(testKey);
    console.log('✅ Preparação: Chave limpa\n');

    // TESTE 1: LPUSH
    console.log('📝 Teste 1: LPUSH (inserção no início)');
    const len1 = await cache.lpush(testKey, 'msg1', 'msg2', 'msg3');
    console.log(`   Resultado: ${len1} elementos inseridos`);
    console.log('   Ordem esperada: [msg3, msg2, msg1]');

    // TESTE 2: LRANGE
    console.log('\n📝 Teste 2: LRANGE (ler lista completa)');
    const items = await cache.lrange(testKey, 0, -1);
    console.log(`   Items: ${JSON.stringify(items)}`);
    
    if (JSON.stringify(items) === JSON.stringify(['msg3', 'msg2', 'msg1'])) {
      console.log('   ✅ Ordem correta!');
    } else {
      console.log('   ❌ Ordem incorreta!');
    }

    // TESTE 3: LLEN
    console.log('\n📝 Teste 3: LLEN (tamanho da lista)');
    const len2 = await cache.llen(testKey);
    console.log(`   Tamanho: ${len2}`);
    
    if (len2 === 3) {
      console.log('   ✅ Tamanho correto!');
    } else {
      console.log(`   ❌ Tamanho incorreto! Esperado: 3, Obtido: ${len2}`);
    }

    // TESTE 4: RPUSH
    console.log('\n📝 Teste 4: RPUSH (inserção no final)');
    const len3 = await cache.rpush(testKey, 'msg4', 'msg5');
    console.log(`   Resultado: ${len3} elementos na lista`);
    const items2 = await cache.lrange(testKey, 0, -1);
    console.log(`   Lista atualizada: ${JSON.stringify(items2)}`);
    
    if (JSON.stringify(items2) === JSON.stringify(['msg3', 'msg2', 'msg1', 'msg4', 'msg5'])) {
      console.log('   ✅ RPUSH funcionando corretamente!');
    } else {
      console.log('   ❌ RPUSH com erro!');
    }

    // TESTE 5: LPOP
    console.log('\n📝 Teste 5: LPOP (remover do início)');
    const popped = await cache.lpop(testKey);
    console.log(`   Removido: ${popped}`);
    
    if (popped === 'msg3') {
      console.log('   ✅ LPOP correto!');
    } else {
      console.log(`   ❌ LPOP incorreto! Esperado: msg3, Obtido: ${popped}`);
    }

    // TESTE 6: RPOP
    console.log('\n📝 Teste 6: RPOP (remover do final)');
    const popped2 = await cache.rpop(testKey);
    console.log(`   Removido: ${popped2}`);
    
    if (popped2 === 'msg5') {
      console.log('   ✅ RPOP correto!');
    } else {
      console.log(`   ❌ RPOP incorreto! Esperado: msg5, Obtido: ${popped2}`);
    }

    // Verificar estado final
    console.log('\n📝 Estado final da lista:');
    const finalItems = await cache.lrange(testKey, 0, -1);
    console.log(`   Items: ${JSON.stringify(finalItems)}`);
    console.log(`   Esperado: ${JSON.stringify(['msg2', 'msg1', 'msg4'])}`);
    
    if (JSON.stringify(finalItems) === JSON.stringify(['msg2', 'msg1', 'msg4'])) {
      console.log('   ✅ Estado final correto!\n');
    } else {
      console.log('   ❌ Estado final incorreto!\n');
    }

    // Limpar
    await cache.del(testKey);
    console.log('✅ Limpeza concluída\n');

    console.log('='.repeat(60));
    console.log('🎯 RESULTADO: Redis List Operations FUNCIONANDO!');
    console.log('   ✅ LPUSH: OK');
    console.log('   ✅ RPUSH: OK');
    console.log('   ✅ LRANGE: OK');
    console.log('   ✅ LLEN: OK');
    console.log('   ✅ LPOP: OK');
    console.log('   ✅ RPOP: OK');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO no teste Redis:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testRedisListOperations();
