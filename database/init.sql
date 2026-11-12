-- =============================================================
-- Calendário Especializado em Seguros
-- Script de inicialização do banco de dados
-- PostgreSQL 15
-- =============================================================

-- =============================================================
-- TABELA: agendamentos
-- =============================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id              SERIAL        PRIMARY KEY,
  titulo          VARCHAR(255)  NOT NULL,
  cliente         VARCHAR(255)  NOT NULL,
  categoria       VARCHAR(50)   NOT NULL,
  icone           VARCHAR(10)   NOT NULL,
  data_vencimento VARCHAR(100)  NOT NULL,
  alerta_critico  BOOLEAN       NOT NULL DEFAULT FALSE,
  concluido       BOOLEAN       NOT NULL DEFAULT FALSE
);

-- =============================================================
-- SEED: Dados iniciais para validação imediata
-- =============================================================

-- Registro 1: Vistoria Residencial (compromisso de hoje)
INSERT INTO agendamentos (titulo, cliente, categoria, icone, data_vencimento, alerta_critico)
VALUES (
  'Vistoria Residencial',
  'Carlos Mendes',
  'Vistoria',
  '[Q]',
  TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
  FALSE
);

-- Registro 2: Renovação de Apólice Auto — CRÍTICO (vence em 3 dias)
INSERT INTO agendamentos (titulo, cliente, categoria, icone, data_vencimento, alerta_critico)
VALUES (
  'Renovação de Apólice Auto',
  'Marina Souza',
  'Renovação',
  '[R]',
  TO_CHAR(CURRENT_DATE + INTERVAL '3 days', 'DD/MM/YYYY'),
  TRUE
);

-- =============================================================
-- Verificação pós-seed
-- =============================================================
DO $$
DECLARE
  total INT;
BEGIN
  SELECT COUNT(*) INTO total FROM agendamentos;
  RAISE NOTICE 'Banco inicializado com sucesso. Total de agendamentos: %', total;
END $$;
