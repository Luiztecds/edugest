import { createClient } from '@supabase/supabase-js';

// Configure suas credenciais do Supabase aqui
// Acesse: https://supabase.com → Seu projeto → Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-anonima';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================== AUTH =====================
export const authService = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: userData }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ===================== ALUNOS =====================
export const alunosService = {
  async listar() {
    const { data, error } = await supabase
      .from('alunos')
      .select('*, turmas(nome)')
      .order('nome');
    if (error) throw error;
    return data;
  },

  async criar(aluno) {
    const { data, error } = await supabase.from('alunos').insert([aluno]).select();
    if (error) throw error;
    return data[0];
  },

  async atualizar(id, aluno) {
    const { data, error } = await supabase.from('alunos').update(aluno).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async excluir(id) {
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    if (error) throw error;
  },

  async buscarPorId(id) {
    const { data, error } = await supabase.from('alunos').select('*, turmas(nome)').eq('id', id).single();
    if (error) throw error;
    return data;
  }
};

// ===================== PROFESSORES =====================
export const professoresService = {
  async listar() {
    const { data, error } = await supabase.from('professores').select('*').order('nome');
    if (error) throw error;
    return data;
  },

  async criar(professor) {
    const { data, error } = await supabase.from('professores').insert([professor]).select();
    if (error) throw error;
    return data[0];
  },

  async atualizar(id, professor) {
    const { data, error } = await supabase.from('professores').update(professor).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async excluir(id) {
    const { error } = await supabase.from('professores').delete().eq('id', id);
    if (error) throw error;
  }
};

// ===================== TURMAS =====================
export const turmasService = {
  async listar() {
    const { data, error } = await supabase
      .from('turmas')
      .select('*, professores(nome, disciplina)')
      .order('nome');
    if (error) throw error;
    return data;
  },

  async criar(turma) {
    const { data, error } = await supabase.from('turmas').insert([turma]).select();
    if (error) throw error;
    return data[0];
  },

  async atualizar(id, turma) {
    const { data, error } = await supabase.from('turmas').update(turma).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async excluir(id) {
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    if (error) throw error;
  },

  async alunosDaTurma(turmaId) {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('turma_id', turmaId);
    if (error) throw error;
    return data;
  }
};

// ===================== NOTAS =====================
export const notasService = {
  async listar(filtros = {}) {
    let query = supabase
      .from('notas')
      .select('*, alunos(nome), turmas(nome)')
      .order('created_at', { ascending: false });

    if (filtros.aluno_id) query = query.eq('aluno_id', filtros.aluno_id);
    if (filtros.turma_id) query = query.eq('turma_id', filtros.turma_id);
    if (filtros.disciplina) query = query.eq('disciplina', filtros.disciplina);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async lancar(nota) {
    const { data, error } = await supabase.from('notas').insert([nota]).select();
    if (error) throw error;
    return data[0];
  },

  async atualizar(id, nota) {
    const { data, error } = await supabase.from('notas').update(nota).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async excluir(id) {
    const { error } = await supabase.from('notas').delete().eq('id', id);
    if (error) throw error;
  }
};

// ===================== FREQUÊNCIA =====================
export const frequenciaService = {
  async listar(filtros = {}) {
    let query = supabase
      .from('frequencia')
      .select('*, alunos(nome), turmas(nome)')
      .order('data', { ascending: false });

    if (filtros.aluno_id) query = query.eq('aluno_id', filtros.aluno_id);
    if (filtros.turma_id) query = query.eq('turma_id', filtros.turma_id);
    if (filtros.data) query = query.eq('data', filtros.data);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async registrar(registros) {
    const { data, error } = await supabase.from('frequencia').upsert(registros, {
      onConflict: 'aluno_id,data,turma_id'
    }).select();
    if (error) throw error;
    return data;
  },

  async relatorio(alunoId) {
    const { data, error } = await supabase
      .from('frequencia')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data;
  }
};

// ===================== DASHBOARD =====================
export const dashboardService = {
  async estatisticas() {
    const [alunos, professores, turmas] = await Promise.all([
      supabase.from('alunos').select('id', { count: 'exact' }),
      supabase.from('professores').select('id', { count: 'exact' }),
      supabase.from('turmas').select('id', { count: 'exact' })
    ]);

    return {
      totalAlunos: alunos.count || 0,
      totalProfessores: professores.count || 0,
      totalTurmas: turmas.count || 0
    };
  }
};

// ===================== CALENDÁRIO =====================
export const calendarioService = {
  async listar() {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('data_inicio');
    if (error) throw error;
    return data;
  },

  async criar(evento) {
    const { data, error } = await supabase.from('eventos').insert([evento]).select();
    if (error) throw error;
    return data[0];
  },

  async atualizar(id, evento) {
    const { data, error } = await supabase.from('eventos').update(evento).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async excluir(id) {
    const { error } = await supabase.from('eventos').delete().eq('id', id);
    if (error) throw error;
  }
};

// ===================== AVISOS =====================
export const avisosService = {
  async listar() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('avisos')
      .select('*, autor:autor_id(email, raw_user_meta_data)')
      .or(`data_expiracao.is.null,data_expiracao.gte.${hoje}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async listarTodos() {
    const { data, error } = await supabase
      .from('avisos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async criar(aviso) {
    const { data, error } = await supabase.from('avisos').insert([aviso]).select();
    if (error) throw error;
    return data[0];
  },

  async atualizar(id, aviso) {
    const { data, error } = await supabase.from('avisos').update(aviso).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async excluir(id) {
    const { error } = await supabase.from('avisos').delete().eq('id', id);
    if (error) throw error;
  }
};

// ===================== PERFIL =====================
export const perfilService = {
  async atualizarMetadata(dados) {
    const { data, error } = await supabase.auth.updateUser({ data: dados });
    if (error) throw error;
    return data.user;
  },

  async alterarSenha(novaSenha) {
    const { data, error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw error;
    return data;
  },

  async uploadFoto(userId, file) {
    const ext  = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl + `?t=${Date.now()}`;
  },

  async removerFoto(userId) {
    // Tenta remover jpg, jpeg, png, webp
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      await supabase.storage.from('avatars').remove([`avatars/${userId}.${ext}`]);
    }
  }
};
