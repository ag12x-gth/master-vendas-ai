-- =========================================
-- CORREÇÃO 8: ÍNDICES OTIMIZADOS
-- Migration: 20251107060327_add_optimized_indexes_up.sql
-- Objetivo: Criar índices compostos para otimizar queries lentas
-- =========================================

-- Índice 1: kanban_leads (company_id, status, created_at)
-- Otimiza queries de busca de leads por empresa, status e ordenação temporal
CREATE INDEX IF NOT EXISTS idx_kanban_leads_company_status_created 
ON kanban_leads (company_id, status, created_at DESC);

-- Índice 2: automation_logs (company_id, created_at)
-- Otimiza queries de logs de automação por empresa e ordenação temporal
CREATE INDEX IF NOT EXISTS idx_automation_logs_company_created 
ON automation_logs (

  -- Índice 3: contacts_to_tags (contact_id, tag_id)
  -- Otimiza JOINs de contatos com tags (já usado na CORREÇÃO 7)
  ON contacts_to_tags (contact_id, tag_id);

  -- Índice 4: contacts_to_contact_lists (contact_id, list_id)
  -- Otimiza JOINs de contatos com listas (já usado na CORREÇÃO 7)
  CREATE INDEX IF NOT EXISTS idx_contacts_to_contact_lists_contact_list 
    ON contacts_to_contact_lists (contact_id, list_id);

-- =========================================
-- VALIDAÇÃO DOS ÍNDICES CRIADOS
-- Execute após a migration:
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE tablename IN ('kanban_leads', 'automation_logs', 'contacts_to_tags', 'contacts_to_contact_lists')
-- ORDER BY tablename, indexname;
-- =========================================
)