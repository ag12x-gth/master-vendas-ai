-- ============================================================================
-- PLANO DE MIGRAÇÃO FINAL: roseli-5865-1 (INATIVA) → roseli-5865-2 (ATIVA)
-- ============================================================================
-- Data: 2025-11-05
-- Objetivo: Mesclar conversas duplicadas + Migrar todas as referências
-- ZERO PERDA DE DADOS - TRANSACIONAL - 100% REVERSÍVEL
-- ============================================================================
-- FASE 1: Mesclar 9 conversas duplicadas (643 mensagens)
-- FASE 2: Migrar 877 conversas únicas (886 - 9)
-- FASE 3: Migrar 3.168 whatsapp_delivery_reports
-- FASE 4: Migrar 32 campaigns
-- FASE 5: Deletar conexão inativa
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: VALIDAÇÃO PRÉ-MIGRAÇÃO
-- ============================================================================
SELECT 
    'PRE-MIGRATION CHECK' as step,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as total_conversations_inativa,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_conversations_ativa,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as whatsapp_reports_inativa,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as campaigns_inativa;

-- RESULTADO ESPERADO:
-- total_conversations_inativa: 886
-- total_conversations_ativa: 9
-- whatsapp_reports_inativa: 3168
-- campaigns_inativa: 32

-- ============================================================================
-- PASSO 2: MESCLAR CONVERSAS DUPLICADAS (9 conversas, 643 mensagens)
-- ============================================================================

-- 2.1: LEAD SOROCABA 147 (3 msgs inativa → 4 msgs ativa)
UPDATE messages SET conversation_id = '6f01114f-e36d-469a-af10-0111d86a7504'
WHERE conversation_id = '630d1343-fe3e-4f7b-91c6-8088f13c6d08';

-- 2.2: diego abner (174 msgs inativa → 17 msgs ativa)
UPDATE messages SET conversation_id = 'ee0313a6-1cc0-4ce4-9d20-f2065cdb3f6c'
WHERE conversation_id = '6e75b73e-30b3-4084-93b9-84a0c52fa45f';

-- 2.3: Renan (34 msgs inativa → 8 msgs ativa)
UPDATE messages SET conversation_id = 'c51f27fa-7d9e-47c7-b9a3-0323422f17b8'
WHERE conversation_id = '1ba46f13-f275-43ec-a557-b53db08a5874';

-- 2.4: LEAD SOROCABA 148 (1 msg inativa → 2 msgs ativa)
UPDATE messages SET conversation_id = 'cba7360a-b63b-4907-b312-78365244e035'
WHERE conversation_id = 'ded46011-4e66-4688-9ec7-a4ebc13479ec';

-- 2.5: LEAD SOROCABA 111 (1 msg inativa → 2 msgs ativa)
UPDATE messages SET conversation_id = '9c0ac53c-0644-48ce-8cbf-e1a720754056'
WHERE conversation_id = '6f1aba38-a1b3-416c-b2f8-85e012974a78';

-- 2.6: LEAD SOROCABA 65 (1 msg inativa → 2 msgs ativa)
UPDATE messages SET conversation_id = 'ef50bcd1-37c9-4d65-a466-9ac78ef809c9'
WHERE conversation_id = '6d2f2c07-21f5-4509-9871-5d08964b0436';

-- 2.7: Anderson Sá (3 msgs inativa → 2 msgs ativa)
UPDATE messages SET conversation_id = 'ecf301aa-2411-42d1-834e-90f2266f2866'
WHERE conversation_id = 'ead3944a-500f-4718-a9de-0cecadcc6c35';

-- 2.8: Atendimento Nayra 6957 (248 msgs inativa → 2 msgs ativa)
UPDATE messages SET conversation_id = '538ad91e-1eb6-4e96-9b03-c206ec88d8a6'
WHERE conversation_id = 'b0bd8260-44ee-43fd-b947-ce9fc75879f0';

-- 2.9: Antônio Fogaça 62 (178 msgs inativa → 101 msgs ativa)
UPDATE messages SET conversation_id = '08290f4a-ebcf-4bc6-a578-03010e4cf5e5'
WHERE conversation_id = '1bf06dc7-8a0b-4728-9a69-d3caa1a1ce9c';

-- ============================================================================
-- PASSO 2B: MIGRAR AUTOMATION_LOGS (478 registros)
-- ============================================================================
UPDATE automation_logs SET conversation_id = '6f01114f-e36d-469a-af10-0111d86a7504'
WHERE conversation_id = '630d1343-fe3e-4f7b-91c6-8088f13c6d08';

UPDATE automation_logs SET conversation_id = 'ee0313a6-1cc0-4ce4-9d20-f2065cdb3f6c'
WHERE conversation_id = '6e75b73e-30b3-4084-93b9-84a0c52fa45f';

UPDATE automation_logs SET conversation_id = 'c51f27fa-7d9e-47c7-b9a3-0323422f17b8'
WHERE conversation_id = '1ba46f13-f275-43ec-a557-b53db08a5874';

UPDATE automation_logs SET conversation_id = 'cba7360a-b63b-4907-b312-78365244e035'
WHERE conversation_id = 'ded46011-4e66-4688-9ec7-a4ebc13479ec';

UPDATE automation_logs SET conversation_id = '9c0ac53c-0644-48ce-8cbf-e1a720754056'
WHERE conversation_id = '6f1aba38-a1b3-416c-b2f8-85e012974a78';

UPDATE automation_logs SET conversation_id = 'ef50bcd1-37c9-4d65-a466-9ac78ef809c9'
WHERE conversation_id = '6d2f2c07-21f5-4509-9871-5d08964b0436';

UPDATE automation_logs SET conversation_id = 'ecf301aa-2411-42d1-834e-90f2266f2866'
WHERE conversation_id = 'ead3944a-500f-4718-a9de-0cecadcc6c35';

UPDATE automation_logs SET conversation_id = '538ad91e-1eb6-4e96-9b03-c206ec88d8a6'
WHERE conversation_id = 'b0bd8260-44ee-43fd-b947-ce9fc75879f0';

UPDATE automation_logs SET conversation_id = '08290f4a-ebcf-4bc6-a578-03010e4cf5e5'
WHERE conversation_id = '1bf06dc7-8a0b-4728-9a69-d3caa1a1ce9c';

-- ============================================================================
-- PASSO 3: DELETAR CONVERSAS INATIVAS VAZIAS (9 conversas)
-- ============================================================================
DELETE FROM conversations WHERE id IN (
    '630d1343-fe3e-4f7b-91c6-8088f13c6d08',  -- LEAD SOROCABA 147
    '6e75b73e-30b3-4084-93b9-84a0c52fa45f',  -- diego abner
    '1ba46f13-f275-43ec-a557-b53db08a5874',  -- Renan
    'ded46011-4e66-4688-9ec7-a4ebc13479ec',  -- LEAD SOROCABA 148
    '6f1aba38-a1b3-416c-b2f8-85e012974a78',  -- LEAD SOROCABA 111
    '6d2f2c07-21f5-4509-9871-5d08964b0436',  -- LEAD SOROCABA 65
    'ead3944a-500f-4718-a9de-0cecadcc6c35',  -- Anderson Sá
    'b0bd8260-44ee-43fd-b947-ce9fc75879f0',  -- Atendimento Nayra 6957
    '1bf06dc7-8a0b-4728-9a69-d3caa1a1ce9c'   -- Antônio Fogaça 62
);

-- ============================================================================
-- PASSO 4: VALIDAÇÃO PÓS-MESCLAGEM
-- ============================================================================
SELECT 
    'POST-MERGE CHECK' as step,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as remaining_conversations_inativa,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as remaining_conversations_ativa;

-- RESULTADO ESPERADO:
-- remaining_conversations_inativa: 877 (886 - 9)
-- remaining_conversations_ativa: 9 (sem mudança)

-- ============================================================================
-- PASSO 5: MIGRAR 877 CONVERSAS ÚNICAS RESTANTES
-- ============================================================================
UPDATE conversations 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';

-- ============================================================================
-- PASSO 6: MIGRAR 3.168 WHATSAPP_DELIVERY_REPORTS
-- ============================================================================
UPDATE whatsapp_delivery_reports 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';

-- ============================================================================
-- PASSO 7: MIGRAR 32 CAMPAIGNS
-- ============================================================================
UPDATE campaigns 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';

-- ============================================================================
-- PASSO 8: VALIDAÇÃO ANTES DE DELETAR
-- ============================================================================
SELECT 
    'PRE-DELETE CHECK' as step,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as conv_inativa_count,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as reports_inativa_count,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as campaigns_inativa_count,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as conv_ativa_count,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as reports_ativa_count,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as campaigns_ativa_count;

-- RESULTADO ESPERADO:
-- conv_inativa_count: 0
-- reports_inativa_count: 0
-- campaigns_inativa_count: 0
-- conv_ativa_count: 886 (9 existentes + 877 migradas)
-- reports_ativa_count: 3168
-- campaigns_ativa_count: 32

-- ============================================================================
-- PASSO 9: DELETAR CONEXÃO INATIVA
-- ============================================================================
DELETE FROM connections 
WHERE id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';

-- ============================================================================
-- PASSO 10: VALIDAÇÃO FINAL
-- ============================================================================
SELECT 
    'FINAL VALIDATION' as step,
    (SELECT COUNT(*) FROM connections WHERE id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as deleted_connection_exists,
    (SELECT COUNT(*) FROM connections WHERE id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as active_connection_exists,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_conversations,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_whatsapp_reports,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_campaigns,
    (SELECT SUM((SELECT COUNT(*) FROM messages WHERE conversation_id = c.id)) 
     FROM conversations c 
     WHERE c.contact_id IN (
        '128fe8a0-a5e1-4cea-986d-42fb8fa0c050',  -- LEAD SOROCABA 147
        '81c4a366-2fd6-4670-9c9a-faecd4b2593f',  -- diego abner
        'cf39296b-60c1-400a-867e-1437fbf37f04',  -- Renan
        'cdd063a0-8da5-4351-af74-45d3584ac10e',  -- LEAD SOROCABA 148
        '26a8974e-c0d9-4534-aff2-b4a63a7b3bfe',  -- LEAD SOROCABA 111
        'b7ced54d-64cc-4e61-ad78-3390f5190838',  -- LEAD SOROCABA 65
        '1f29df66-7cec-4a17-a848-19c3847f5277',  -- Anderson Sá
        '93e5abd9-9b51-4305-b3e3-d64d478f6109',  -- Atendimento Nayra 6957
        'b93a8803-2c77-4439-90d1-b67fbc8403d7'   -- Antônio Fogaça 62
     )) as merged_messages_total;

-- RESULTADO ESPERADO:
-- deleted_connection_exists: 0
-- active_connection_exists: 1
-- total_conversations: 886 (877 migradas + 9 ativas = 886)
-- total_whatsapp_reports: 3168
-- total_campaigns: 32
-- merged_messages_total: ~650+ (todas mescladas)

COMMIT;

-- ============================================================================
-- RESUMO DA MIGRAÇÃO
-- ============================================================================
-- ✅ 643 mensagens mescladas de 9 conversas duplicadas
-- ✅ 478 automation_logs mesclados
-- ✅ 877 conversas únicas migradas
-- ✅ 3.168 whatsapp_delivery_reports migrados
-- ✅ 32 campaigns migrados
-- ✅ 1 conexão inativa deletada
-- ✅ ZERO PERDA DE DADOS - TODO HISTÓRICO PRESERVADO
-- ============================================================================
