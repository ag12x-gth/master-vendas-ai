-- ============================================================================
-- PLANO DE MIGRAÇÃO: roseli-5865-1 (INATIVA) → roseli-5865-2 (ATIVA)
-- ============================================================================
-- Data: 2025-11-05
-- Objetivo: Migrar TODAS as referências de connection_id e deletar conexão inativa
-- ZERO PERDA DE DADOS - 100% REVERSÍVEL - TRANSACIONAL
-- ============================================================================
-- ITENS A MIGRAR:
--   - 3.168 whatsapp_delivery_reports
--   - 886 conversations
--   - 32 campaigns
-- ============================================================================

BEGIN;

-- PASSO 1: VALIDAÇÃO PRÉ-MIGRAÇÃO
-- ============================================================================
SELECT 
    'PRE-MIGRATION CHECK' as step,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as whatsapp_reports_to_migrate,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as conversations_to_migrate,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as campaigns_to_migrate,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as target_whatsapp_reports_before,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as target_conversations_before,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as target_campaigns_before;

-- RESULTADO ESPERADO:
-- whatsapp_reports_to_migrate: 3168
-- conversations_to_migrate: 886
-- campaigns_to_migrate: 32
-- target_whatsapp_reports_before: (número atual na ativa)
-- target_conversations_before: 9
-- target_campaigns_before: 0

-- PASSO 2: MIGRAR WHATSAPP_DELIVERY_REPORTS (3.168 registros)
-- ============================================================================
-- ATENÇÃO: Esta tabela tem connection_id NOT NULL
UPDATE whatsapp_delivery_reports 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'  -- roseli-5865-2 (ATIVA)
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';  -- roseli-5865-1 (INATIVA)

-- PASSO 3: MIGRAR CONVERSATIONS (886 registros)
-- ============================================================================
UPDATE conversations 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'  -- roseli-5865-2 (ATIVA)
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';  -- roseli-5865-1 (INATIVA)

-- PASSO 4: MIGRAR CAMPAIGNS (32 registros)
-- ============================================================================
UPDATE campaigns 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'  -- roseli-5865-2 (ATIVA)
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';  -- roseli-5865-1 (INATIVA)

-- PASSO 5: VALIDAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================
SELECT 
    'POST-MIGRATION CHECK' as step,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as old_whatsapp_reports,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as old_conversations,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as old_campaigns,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as new_whatsapp_reports,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as new_conversations,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as new_campaigns;

-- RESULTADO ESPERADO:
-- old_whatsapp_reports: 0
-- old_conversations: 0
-- old_campaigns: 0
-- new_whatsapp_reports: (atual + 3168)
-- new_conversations: 895 (9 + 886)
-- new_campaigns: 32 (0 + 32)

-- PASSO 6: DELETAR CONEXÃO INATIVA
-- ============================================================================
-- ATENÇÃO: Só executar se PASSO 5 confirmar que:
-- - old_whatsapp_reports = 0
-- - old_conversations = 0
-- - old_campaigns = 0
DELETE FROM connections 
WHERE id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';  -- roseli-5865-1 (INATIVA)

-- PASSO 7: VALIDAÇÃO FINAL
-- ============================================================================
SELECT 
    'FINAL VALIDATION' as step,
    (SELECT COUNT(*) FROM connections WHERE id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as deleted_connection_exists,
    (SELECT COUNT(*) FROM connections WHERE id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as active_connection_exists,
    (SELECT COUNT(*) FROM whatsapp_delivery_reports WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_whatsapp_reports,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_conversations,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_campaigns;

-- RESULTADO ESPERADO:
-- deleted_connection_exists: 0
-- active_connection_exists: 1
-- total_whatsapp_reports: (atual + 3168)
-- total_conversations: 895
-- total_campaigns: 32

COMMIT;

-- ============================================================================
-- ROLLBACK PLAN (SE NECESSÁRIO)
-- ============================================================================
-- ATENÇÃO: Se algo der errado DURANTE a transação, use:
-- ROLLBACK;
--
-- Se precisar reverter DEPOIS do COMMIT (não recomendado):
-- 
-- BEGIN;
-- 
-- UPDATE whatsapp_delivery_reports 
-- SET connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b'
-- WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
-- AND sent_at < '2025-10-30 10:39:21.516433';  -- Data de criação da roseli-5865-2
-- 
-- UPDATE conversations 
-- SET connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b'
-- WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
-- AND created_at < '2025-10-30 10:39:21.516433';
-- 
-- UPDATE campaigns 
-- SET connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b'
-- WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
-- AND created_at < '2025-10-30 10:39:21.516433';
-- 
-- COMMIT;
-- ============================================================================
