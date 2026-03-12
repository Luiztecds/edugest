-- ============================================================
-- EDUGEST - Tabela de Eventos (Calendário Escolar)
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS eventos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo      TEXT NOT NULL,
  tipo        TEXT DEFAULT 'evento' CHECK (tipo IN ('prova', 'feriado', 'evento', 'reuniao', 'entrega', 'recesso')),
  data_inicio DATE NOT NULL,
  data_fim    DATE,
  descricao   TEXT,
  turma       TEXT,
  dia_todo    BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver
CREATE POLICY "autenticados_ver_eventos" ON eventos
  FOR SELECT TO authenticated
  USING (true);

-- Só admin e professor podem criar/editar/excluir
CREATE POLICY "admin_professor_gerenciar_eventos" ON eventos
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'perfil') IN ('admin', 'professor')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'perfil') IN ('admin', 'professor')
  );
