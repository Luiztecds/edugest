-- ============================================================
-- EDUGEST - Tabela de Avisos (Mural)
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS avisos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo           TEXT NOT NULL,
  conteudo         TEXT NOT NULL,
  tipo             TEXT DEFAULT 'geral' CHECK (tipo IN ('geral', 'urgente', 'evento', 'feriado')),
  publico_alvo     TEXT DEFAULT 'todos' CHECK (publico_alvo IN ('todos', 'alunos', 'professores')),
  autor_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome       TEXT,
  data_expiracao   DATE,
  fixado           BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler avisos ativos
CREATE POLICY "autenticados_ver_avisos" ON avisos
  FOR SELECT TO authenticated
  USING (true);

-- Admin pode fazer tudo
CREATE POLICY "admin_gerenciar_avisos" ON avisos
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'perfil') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'perfil') = 'admin');

-- Professor pode criar e gerenciar os próprios avisos
CREATE POLICY "professor_criar_aviso" ON avisos
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'perfil') = 'professor');

CREATE POLICY "professor_editar_proprio_aviso" ON avisos
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'perfil') = 'professor'
    AND autor_id = auth.uid()
  );

CREATE POLICY "professor_excluir_proprio_aviso" ON avisos
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'perfil') = 'professor'
    AND autor_id = auth.uid()
  );
