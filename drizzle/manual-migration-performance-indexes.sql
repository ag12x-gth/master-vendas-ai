-- MIGRATION: Performance Optimization Indexes
-- Date: 2025-11-05
-- Purpose: Add critical indexes to improve query performance

-- 1. Kanban Leads Indexes (Critical for Kanban board queries)
CREATE INDEX IF NOT EXISTS idx_kanban_leads_contact_id ON kanban_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_kanban_leads_board_id ON kanban_leads(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_leads_stage_id ON kanban_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_kanban_leads_board_stage ON kanban_leads(board_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_kanban_leads_created_at ON kanban_leads(created_at DESC);

-- 2. Contacts to Tags Index (Resolve N+1 queries)
CREATE INDEX IF NOT EXISTS idx_contacts_to_tags_contact ON contacts_to_tags(contact_id, tag_id);

-- 3. Contacts to Lists Index (Resolve N+1 queries)
CREATE INDEX IF NOT EXISTS idx_contacts_to_lists_contact ON contacts_to_contact_lists(contact_id, list_id);

-- 4. Automation Logs Composite Index
CREATE INDEX IF NOT EXISTS idx_automation_logs_company_conversation 
  ON automation_logs(company_id, conversation_id, created_at DESC);

-- Analyze tables to update statistics
ANALYZE kanban_leads;
ANALYZE contacts_to_tags;
ANALYZE contacts_to_contact_lists;
ANALYZE automation_logs;
