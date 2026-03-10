-- ============================================================
-- EDUGEST - Schema SQL para Supabase
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- ============================================================

-- TABELA: professores
CREATE TABLE IF NOT EXISTS professores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  disciplina TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: turmas
CREATE TABLE IF NOT EXISTS turmas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  serie TEXT,
  ano TEXT,
  professor_id UUID REFERENCES professores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: alunos
CREATE TABLE IF NOT EXISTS alunos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: notas
CREATE TABLE IF NOT EXISTS notas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
  disciplina TEXT NOT NULL,
  bimestre TEXT DEFAULT '1º Bimestre',
  nota NUMERIC(4,2) CHECK (nota >= 0 AND nota <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: frequencia
CREATE TABLE IF NOT EXISTS frequencia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  status TEXT DEFAULT 'presente' CHECK (status IN ('presente', 'falta')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, data, turma_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados têm acesso total
CREATE POLICY "Autenticados podem ver professores" ON professores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem ver turmas" ON turmas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem ver alunos" ON alunos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem ver notas" ON notas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem ver frequencia" ON frequencia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DADOS DE EXEMPLO (opcional)
-- ============================================================

-- INSERT INTO professores (nome, disciplina, email, telefone)
-- VALUES
--   ('Maria Silva', 'Matemática', 'maria@escola.com', '(31) 99999-1111'),
--   ('João Oliveira', 'Português', 'joao@escola.com', '(31) 99999-2222'),
--   ('Ana Costa', 'Ciências', 'ana@escola.com', '(31) 99999-3333');
