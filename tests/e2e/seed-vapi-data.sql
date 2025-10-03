-- ===================================
-- SEED E2E - VOICE CALLS VAPI AI
-- ===================================
-- Descrição: Script de seed para testes E2E do sistema Voice Calls
-- Data: 2025-10-03
-- Ambiente: Development/Testing
-- ===================================

-- STEP 1: Criar company para testes E2E
INSERT INTO companies (id, name, created_at) 
VALUES ('52fef76d-459c-462d-834b-e6eade8f6adf', 'Master IA E2E Testing', NOW())
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Criar usuário teste E2E
-- Senha: Test@2025!E2E (bcrypt hash)
INSERT INTO users (id, company_id, email, password, firebase_uid, name, role, email_verified, created_at) 
VALUES (
  'e2e-user-001',
  '52fef76d-459c-462d-834b-e6eade8f6adf',
  'teste.e2e@masteriaoficial.com',
  '$2a$10$Hh9yZBx3YQVZqK3Z.zN7.eX7K4xZ3Y8QJ7L5zN9W1cZ2xK3Y4Z5Q6',
  'e2e-firebase-uid-001',
  'Usuário E2E',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET 
  firebase_uid = EXCLUDED.firebase_uid,
  password = EXCLUDED.password,
  email_verified = NOW();

-- STEP 3: Criar 5 contatos brasileiros
INSERT INTO contacts (id, company_id, name, phone, created_at) VALUES 
('43ec8eb3-abb4-4e85-af34-067010f80458', '52fef76d-459c-462d-834b-e6eade8f6adf', 'Maria Silva', '+5511987654321', NOW()),
('4a39493b-e787-4275-873f-9721f2c64bed', '52fef76d-459c-462d-834b-e6eade8f6adf', 'João Santos', '+5521976543210', NOW()),
('adbc86f8-5a9d-469e-875d-541de42219f3', '52fef76d-459c-462d-834b-e6eade8f6adf', 'Ana Costa', '+5531965432109', NOW()),
('72768385-e2bf-4e44-b7c8-87bc3c9e8f7c', '52fef76d-459c-462d-834b-e6eade8f6adf', 'Pedro Oliveira', '+5541954321098', NOW()),
('ff6398e9-e486-4fd2-890e-d405ae34410a', '52fef76d-459c-462d-834b-e6eade8f6adf', 'Carla Souza', '+5551943210987', NOW())
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Criar 5 chamadas Vapi (3 completed, 1 in-progress, 1 failed)
INSERT INTO vapi_calls (
  id, 
  company_id, 
  contact_id, 
  customer_name, 
  customer_number, 
  status, 
  duration, 
  summary, 
  analysis, 
  started_at, 
  ended_at, 
  vapi_call_id, 
  created_at
) VALUES 
(
  '01658696-7a14-49a2-b1f3-2c0cfd9a1fa3', 
  '52fef76d-459c-462d-834b-e6eade8f6adf', 
  '43ec8eb3-abb4-4e85-af34-067010f80458', 
  'Maria Silva', 
  '+5511987654321', 
  'completed', 
  120, 
  'Cliente interessado em planos empresariais', 
  '{"sentiment": "positive", "interest_level": "high"}', 
  '2025-10-03T01:20:10.503Z', 
  '2025-10-03T01:22:10.503Z', 
  'vapi-e2e-001', 
  NOW()
),
(
  '0f3bd7d7-cb83-4afb-b4b3-9af8275dfed5', 
  '52fef76d-459c-462d-834b-e6eade8f6adf', 
  '4a39493b-e787-4275-873f-9721f2c64bed', 
  'João Santos', 
  '+5521976543210', 
  'completed', 
  85, 
  'Dúvidas sobre preços e funcionalidades', 
  '{"sentiment": "neutral", "interest_level": "medium"}', 
  '2025-10-03T00:20:10.503Z', 
  '2025-10-03T00:21:35.503Z', 
  'vapi-e2e-002', 
  NOW()
),
(
  '808fb589-8a93-4ff0-aca5-ebe246a2d242', 
  '52fef76d-459c-462d-834b-e6eade8f6adf', 
  'adbc86f8-5a9d-469e-875d-541de42219f3', 
  'Ana Costa', 
  '+5531965432109', 
  'in-progress', 
  NULL, 
  NULL, 
  '{}', 
  '2025-10-02T23:20:10.503Z', 
  NULL, 
  'vapi-e2e-003', 
  NOW()
),
(
  '7a4d1dcf-6afd-48dd-ba02-011f99f285fe', 
  '52fef76d-459c-462d-834b-e6eade8f6adf', 
  '72768385-e2bf-4e44-b7c8-87bc3c9e8f7c', 
  'Pedro Oliveira', 
  '+5541954321098', 
  'failed', 
  NULL, 
  'Cliente não atendeu', 
  '{"call_status": "no_answer"}', 
  '2025-10-02T22:20:10.503Z', 
  NULL, 
  'vapi-e2e-004', 
  NOW()
),
(
  '9c253999-3285-4fe4-a67d-610cdb26331d', 
  '52fef76d-459c-462d-834b-e6eade8f6adf', 
  'ff6398e9-e486-4fd2-890e-d405ae34410a', 
  'Carla Souza', 
  '+5551943210987', 
  'completed', 
  240, 
  'Reunião de follow-up, fechou contrato', 
  '{"sentiment": "positive", "interest_level": "very_high", "deal_closed": true}', 
  '2025-10-02T21:20:10.503Z', 
  '2025-10-02T21:24:10.503Z', 
  'vapi-e2e-005', 
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ===================================
-- VALIDAÇÃO DOS DADOS
-- ===================================

-- Verificar métricas criadas
SELECT 
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COALESCE(AVG(duration) FILTER (WHERE duration IS NOT NULL), 0) as avg_duration,
  ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::decimal / COUNT(*)::decimal * 100), 2) as success_rate
FROM vapi_calls 
WHERE company_id = '52fef76d-459c-462d-834b-e6eade8f6adf';

-- Resultado esperado:
-- total_calls: 5
-- completed: 3
-- in_progress: 1
-- failed: 1
-- avg_duration: 148.33
-- success_rate: 60.00
