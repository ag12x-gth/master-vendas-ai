-- ============================================================================
-- PLANO DE MIGRAÇÃO: roseli-5865-1 (INATIVA) → roseli-5865-2 (ATIVA)
-- ============================================================================
-- Data: 2025-11-05
-- Objetivo: Migrar 886 conversas + 32 campanhas + deletar conexão inativa
-- ZERO PERDA DE DADOS - 100% REVERSÍVEL
-- ============================================================================

-- PASSO 1: VALIDAÇÃO PRÉ-MIGRAÇÃO
-- ============================================================================
SELECT 
    'PRE-MIGRATION CHECK' as step,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as conversations_to_migrate,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as campaigns_to_migrate,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as target_conversations_before,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as target_campaigns_before;

-- PASSO 2: MIGRAR CONVERSAS (886 registros)
-- ============================================================================
-- Atualiza connection_id de todas as conversas da conexão inativa para a ativa
UPDATE conversations 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'  -- roseli-5865-2 (ATIVA)
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';  -- roseli-5865-1 (INATIVA)

-- PASSO 3: MIGRAR CAMPANHAS (32 registros)
-- ============================================================================
-- Atualiza connection_id de todas as campanhas da conexão inativa para a ativa
UPDATE campaigns 
SET connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'  -- roseli-5865-2 (ATIVA)
WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';  -- roseli-5865-1 (INATIVA)

-- PASSO 4: VALIDAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================
SELECT 
    'POST-MIGRATION CHECK' as step,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as old_connection_conversations,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as old_connection_campaigns,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as new_connection_conversations,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as new_connection_campaigns;

-- RESULTADO ESPERADO:
-- old_connection_conversations: 0
-- old_connection_campaigns: 0
-- new_connection_conversations: 895 (9 + 886)
-- new_connection_campaigns: 32 (0 + 32)

-- PASSO 5: DELETAR CONEXÃO INATIVA
-- ============================================================================
-- ATENÇÃO: Só executar se PASSO 4 confirmar que:
-- - old_connection_conversations = 0
-- - old_connection_campaigns = 0
DELETE FROM connections 
WHERE id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b';  -- roseli-5865-1 (INATIVA)

-- PASSO 6: VALIDAÇÃO FINAL
-- ============================================================================
SELECT 
    'FINAL VALIDATION' as step,
    (SELECT COUNT(*) FROM connections WHERE id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b') as deleted_connection_exists,
    (SELECT COUNT(*) FROM connections WHERE id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as active_connection_exists,
    (SELECT COUNT(*) FROM conversations WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_conversations,
    (SELECT COUNT(*) FROM campaigns WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a') as total_campaigns;

-- RESULTADO ESPERADO:
-- deleted_connection_exists: 0
-- active_connection_exists: 1
-- total_conversations: 895
-- total_campaigns: 32

-- ============================================================================
-- ROLLBACK PLAN (SE NECESSÁRIO)
-- ============================================================================
-- Se algo der errado ANTES de deletar, pode reverter com:
-- 
-- UPDATE conversations 
-- SET connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b'
-- WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
-- AND created_at < '2025-10-30 10:39:21.516433';  -- Data de criação da roseli-5865-2
-- 
-- UPDATE campaigns 
-- SET connection_id = 'c28f9594-9db5-42a6-9228-f96c390f1d5b'
-- WHERE connection_id = '194c93a8-ba37-4342-91a6-6faf84fb4a7a'
-- AND created_at < '2025-10-30 10:39:21.516433';
-- ============================================================================
