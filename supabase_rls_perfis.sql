-- ============================================================
-- EDUGEST - Políticas RLS por perfil
-- Execute no SQL Editor do Supabase APÓS o schema inicial
-- ============================================================

-- Remove políticas antigas genéricas
DROP POLICY IF EXISTS "Autenticados podem ver professores" ON professores;
DROP POLICY IF EXISTS "Autenticados podem ver turmas"     ON turmas;
DROP POLICY IF EXISTS "Autenticados podem ver alunos"     ON alunos;
DROP POLICY IF EXISTS "Autenticados podem ver notas"      ON notas;
DROP POLICY IF EXISTS "Autenticados podem ver frequencia" ON frequencia;

-- ============================================================
-- HELPER: função que retorna o perfil do usuário logado
-- ============================================================
CREATE OR REPLACE FUNCTION perfil_usuario()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'perfil'),
    'aluno'
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- PROFESSORES
-- Admin: tudo | Professor/Aluno: só leitura
-- ============================================================
CREATE POLICY "admin_professores_tudo" ON professores
  FOR ALL TO authenticated
  USING (perfil_usuario() = 'admin')
  WITH CHECK (perfil_usuario() = 'admin');

CREATE POLICY "professor_aluno_ver_professores" ON professores
  FOR SELECT TO authenticated
  USING (perfil_usuario() IN ('professor', 'aluno'));

-- ============================================================
-- TURMAS
-- Admin: tudo | Professor/Aluno: só leitura
-- ============================================================
CREATE POLICY "admin_turmas_tudo" ON turmas
  FOR ALL TO authenticated
  USING (perfil_usuario() = 'admin')
  WITH CHECK (perfil_usuario() = 'admin');

CREATE POLICY "professor_aluno_ver_turmas" ON turmas
  FOR SELECT TO authenticated
  USING (perfil_usuario() IN ('professor', 'aluno'));

-- ============================================================
-- ALUNOS
-- Admin: tudo | Professor: leitura | Aluno: só os próprios dados
-- ============================================================
CREATE POLICY "admin_alunos_tudo" ON alunos
  FOR ALL TO authenticated
  USING (perfil_usuario() = 'admin')
  WITH CHECK (perfil_usuario() = 'admin');

CREATE POLICY "professor_ver_alunos" ON alunos
  FOR SELECT TO authenticated
  USING (perfil_usuario() = 'professor');

CREATE POLICY "aluno_ver_proprio" ON alunos
  FOR SELECT TO authenticated
  USING (
    perfil_usuario() = 'aluno'
    AND email = auth.jwt() ->> 'email'
  );

-- ============================================================
-- NOTAS
-- Admin: tudo | Professor: inserir/editar/excluir/ler | Aluno: só ler as suas
-- ============================================================
CREATE POLICY "admin_notas_tudo" ON notas
  FOR ALL TO authenticated
  USING (perfil_usuario() = 'admin')
  WITH CHECK (perfil_usuario() = 'admin');

CREATE POLICY "professor_gerenciar_notas" ON notas
  FOR ALL TO authenticated
  USING (perfil_usuario() = 'professor')
  WITH CHECK (perfil_usuario() = 'professor');

CREATE POLICY "aluno_ver_proprias_notas" ON notas
  FOR SELECT TO authenticated
  USING (
    perfil_usuario() = 'aluno'
    AND aluno_id IN (
      SELECT id FROM alunos
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- FREQUÊNCIA
-- Admin: tudo | Professor: inserir/editar/ler | Aluno: só ler a sua
-- ============================================================
CREATE POLICY "admin_frequencia_tudo" ON frequencia
  FOR ALL TO authenticated
  USING (perfil_usuario() = 'admin')
  WITH CHECK (perfil_usuario() = 'admin');

CREATE POLICY "professor_gerenciar_frequencia" ON frequencia
  FOR ALL TO authenticated
  USING (perfil_usuario() = 'professor')
  WITH CHECK (perfil_usuario() = 'professor');

CREATE POLICY "aluno_ver_propria_frequencia" ON frequencia
  FOR SELECT TO authenticated
  USING (
    perfil_usuario() = 'aluno'
    AND aluno_id IN (
      SELECT id FROM alunos
      WHERE email = auth.jwt() ->> 'email'
    )
  );
