-- =============================================================
-- Calendário Especializado em Seguros (Exp. I & Exp. II)
-- Script de inicialização do banco de dados PostgreSQL 15/16+
-- =============================================================

-- Habilita extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABELA: users (RNF01, Exp. II - Slide 13/14)
-- Armazena credenciais e operadores da corretora
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     VARCHAR(150)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: appointments (RF01, RF02, RF03, Exp. II - Slide 13/14)
-- Armazena compromissos e tarefas com dupla codificação e alerta preditivo
-- =============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              VARCHAR(150)  NOT NULL,
  client_name        VARCHAR(150)  NOT NULL, -- LGPD: minimização de dados sensíveis
  category           VARCHAR(50)   NOT NULL, -- 'Renewal', 'Inspection', 'Claim', 'Meeting', 'Other'
  accessible_icon    VARCHAR(50)   NOT NULL, -- PrimeIcons: 'pi-refresh', 'pi-search', 'pi-exclamation-triangle', 'pi-users'
  accessible_label   VARCHAR(50)   NOT NULL, -- 'Renovação', 'Vistoria', 'Sinistro', 'Reunião', 'Outros' (ou tipo personalizado)
  appointment_date   DATE          NOT NULL,
  appointment_time   TIME,
  alert_lead_days    INTEGER       NOT NULL DEFAULT 30,
  alert_trigger_date DATE          NOT NULL, -- Calculado automaticamente: appointment_date - alert_lead_days
  is_completed       BOOLEAN       NOT NULL DEFAULT FALSE,
  notes              TEXT
);

-- =============================================================
-- ÍNDICES (Desempenho e busca do corretor)
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_user_date 
  ON appointments (user_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_alert_trigger
  ON appointments (user_id, alert_trigger_date, is_completed);

CREATE INDEX IF NOT EXISTS idx_appointments_category
  ON appointments (category);

-- =============================================================
-- SEED: Dados iniciais para homologação e validação prática
-- Usuário: Breno Forti (sócio-proprietário, persona dos testes)
-- Senha de teste padrão: "SeguroTech2024!" (hash bcrypt com custo 12)
-- =============================================================
INSERT INTO users (id, full_name, email, password_hash)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Breno Forti dos Santos',
  'breno@fortiseguros.com.br',
  '$2b$12$laUKXRQ1x5IVqNW7vJzbJOc2Fx4r3LwFuQ3M1A68Mkw2hdEQbwyjq'
)
ON CONFLICT (email) DO NOTHING;

-- Compromisso 1: Renovação de Apólice Auto (Carlos Silva)
-- Data: 15/11/2026 | Antecedência: 30 dias | Alerta: 16/10/2026
INSERT INTO appointments (
  id, user_id, title, client_name, category, accessible_icon, accessible_label,
  appointment_date, alert_lead_days, alert_trigger_date, is_completed, notes
) VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Renovação Apólice Auto',
  'Carlos Silva',
  'Renewal',
  'pi-refresh',
  'Renovação',
  '2026-11-15',
  30,
  '2026-10-16',
  FALSE,
  'Apólice Auto Frota - Contato prévio de 30 dias.'
)
ON CONFLICT (id) DO NOTHING;

-- Compromisso 2: Vistoria Residencial (Mariana Souza)
-- Data: 20/11/2026 | Antecedência: 30 dias | Alerta: 21/10/2026
INSERT INTO appointments (
  id, user_id, title, client_name, category, accessible_icon, accessible_label,
  appointment_date, alert_lead_days, alert_trigger_date, is_completed, notes
) VALUES (
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Vistoria Residencial',
  'Mariana Souza',
  'Inspection',
  'pi-search',
  'Vistoria',
  '2026-11-20',
  30,
  '2026-10-21',
  FALSE,
  'Vistoria prévia residencial em condomínio fechado.'
)
ON CONFLICT (id) DO NOTHING;

-- Compromisso 3: Renovação empresarial prioritária (Mercado Silva Ltda)
-- Data: 21/11/2026 | Antecedência: 30 dias | Alerta: 22/10/2026
INSERT INTO appointments (
  id, user_id, title, client_name, category, accessible_icon, accessible_label,
  appointment_date, alert_lead_days, alert_trigger_date, is_completed, notes
) VALUES (
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Renovação Seguro Empresarial',
  'Mercado Silva Ltda',
  'Renewal',
  'pi-refresh',
  'Renovação',
  '2026-11-21',
  30,
  '2026-10-22',
  FALSE,
  'Apólice AP-2026-8841-BR. Cliente empresarial prioritário.'
)
ON CONFLICT (id) DO NOTHING;

-- Compromisso 4: Reunião futura (alerta ainda não disparado)
-- Data: 20/01/2027 | Antecedência: 15 dias | Alerta: 05/01/2027
INSERT INTO appointments (
  id, user_id, title, client_name, category, accessible_icon, accessible_label,
  appointment_date, appointment_time, alert_lead_days, alert_trigger_date, is_completed, notes
) VALUES (
  'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Reunião de apresentação de proposta',
  'Transportadora Rota Sul',
  'Meeting',
  'pi-users',
  'Reunião',
  '2027-01-20',
  '14:30',
  15,
  '2027-01-05',
  FALSE,
  'Levar comparativo de três seguradoras.'
)
ON CONFLICT (id) DO NOTHING;

-- Compromisso 5: Sinistro já concluído (exemplo de estado finalizado)
-- Data: 05/11/2026 | Antecedência: 3 dias | Alerta: 02/11/2026
INSERT INTO appointments (
  id, user_id, title, client_name, category, accessible_icon, accessible_label,
  appointment_date, alert_lead_days, alert_trigger_date, is_completed, notes
) VALUES (
  'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Entrega de documentos do sinistro',
  'João Pereira',
  'Claim',
  'pi-exclamation-triangle',
  'Sinistro',
  '2026-11-05',
  3,
  '2026-11-02',
  TRUE,
  'Documentação enviada à seguradora.'
)
ON CONFLICT (id) DO NOTHING;
