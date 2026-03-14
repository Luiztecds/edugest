import { useEffect, useState } from 'react';
import { alunosService, turmasService, supabaseAdmin } from '../services/supabase';

const FORM_INICIAL = {
  nome: '', data_nascimento: '', cpf: '', email: '', telefone: '', endereco: '', turma_id: '',
  senha: '',
};

function maskCPF(v) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14);
}
function maskTel(v) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
}

// Sincroniza com Supabase Auth (cria ou atualiza usuário)
async function sincronizarAuth(email, senha, nome, authId) {
  if (!supabaseAdmin || !email) return null;
  try {
    if (authId) {
      // Já tem conta — atualiza email/senha/metadata
      const updates = { user_metadata: { nome, perfil: 'aluno' } };
      if (email) updates.email = email;
      if (senha) updates.password = senha;
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authId, updates);
      if (error) throw error;
      return data.user.id;
    } else {
      // Cria nova conta
      const payload = {
        email,
        email_confirm: true,
        user_metadata: { nome, perfil: 'aluno' },
      };
      if (senha) payload.password = senha;
      else payload.password = Math.random().toString(36).slice(-10) + 'A1!'; // senha aleatória se não informada
      const { data, error } = await supabaseAdmin.auth.admin.createUser(payload);
      if (error) {
        if (error.message?.includes('already registered')) return null; // já existe, ignora
        throw error;
      }
      return data.user.id;
    }
  } catch (e) {
    console.warn('Auth sync:', e.message);
    return null;
  }
}

export default function Alunos() {
  const [alunos, setAlunos]     = useState([]);
  const [turmas, setTurmas]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm]         = useState(FORM_INICIAL);
  const [busca, setBusca]       = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState('');
  const [sucesso, setSucesso]   = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([alunosService.listar(), turmasService.listar()]);
      setAlunos(a); setTurmas(t);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirModal = (aluno = null) => {
    setEditando(aluno);
    setForm(aluno ? { ...aluno, senha: '' } : FORM_INICIAL);
    setErro(''); setModalOpen(true);
  };

  const fecharModal = () => { setModalOpen(false); setEditando(null); setForm(FORM_INICIAL); };

  const handleChange = e => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'cpf') v = maskCPF(value);
    if (name === 'telefone') v = maskTel(value);
    setForm(f => ({ ...f, [name]: v }));
  };

  const salvar = async () => {
    if (!form.nome) { setErro('Nome é obrigatório.'); return; }
    if (form.senha && form.senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setSalvando(true); setErro('');
    try {
      // Monta payload apenas com colunas que existem na tabela
      const { senha, turmas: _turmas, ...resto } = form;
      const dadosDB = {
        nome:            resto.nome            || null,
        data_nascimento: resto.data_nascimento || null,
        cpf:             resto.cpf             || null,
        email:           resto.email           || null,
        telefone:        resto.telefone        || null,
        endereco:        resto.endereco        || null,
        turma_id:        resto.turma_id        || null,
      };

      if (editando) {
        // Sincroniza Auth primeiro para obter/atualizar auth_id
        let authId = editando.auth_id || null;
        if (form.email) {
          authId = await sincronizarAuth(form.email, form.senha || null, form.nome, authId);
        }
        await alunosService.atualizar(editando.id, { ...dadosDB, auth_id: authId });
      } else {
        // Cria aluno, depois vincula auth_id se tiver email
        const novoAluno = await alunosService.criar(dadosDB);
        if (form.email) {
          const authId = await sincronizarAuth(form.email, form.senha || null, form.nome, null);
          if (authId) await alunosService.atualizar(novoAluno.id, { auth_id: authId });
        }
      }

      await carregar();
      fecharModal();
      setSucesso(editando ? 'Aluno atualizado!' : 'Aluno cadastrado!');
      setTimeout(() => setSucesso(''), 3000);
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este aluno?')) return;
    try {
      await alunosService.excluir(id);
      setAlunos(a => a.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  const filtrados = alunos.filter(a =>
    a.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    a.email?.toLowerCase().includes(busca.toLowerCase()) ||
    a.cpf?.includes(busca)
  );

  const temAuth = !!supabaseAdmin;

  return (
    <>
      {sucesso && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {sucesso}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Alunos ({filtrados.length})</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="search-bar">
              <span>🔍</span>
              <input placeholder="Buscar aluno..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => abrirModal()}>+ Novo Aluno</button>
          </div>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : filtrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🎓</div>
              <h3>Nenhum aluno encontrado</h3>
              <p>Cadastre o primeiro aluno clicando em "Novo Aluno"</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th><th>CPF</th><th>Email</th><th>Telefone</th><th>Turma</th><th>Acesso</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--teal-light)', color:'var(--teal-dark)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>
                          {a.nome?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{a.nome}</span>
                      </div>
                    </td>
                    <td style={{ color:'var(--gray-500)', fontFamily:'monospace' }}>{a.cpf || '—'}</td>
                    <td style={{ color:'var(--gray-500)' }}>{a.email || '—'}</td>
                    <td style={{ color:'var(--gray-500)' }}>{a.telefone || '—'}</td>
                    <td>{a.turmas?.nome ? <span className="badge badge-teal">{a.turmas.nome}</span> : <span className="badge badge-gray">—</span>}</td>
                    <td>
                      {a.email
                        ? <span className="badge badge-green" style={{ background:'#d1fae5', color:'#065f46' }}>✓ Tem acesso</span>
                        : <span className="badge badge-gray">Sem acesso</span>
                      }
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => abrirModal(a)}>✏️ Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => excluir(a.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2>{editando ? 'Editar Aluno' : 'Novo Aluno'}</h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}

              {/* Dados pessoais */}
              <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
                Dados pessoais
              </div>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Nome completo *</label>
                  <input className="form-input" name="nome" value={form.nome} onChange={handleChange} placeholder="Nome do aluno" />
                </div>
                <div className="form-group">
                  <label className="form-label">Data de nascimento</label>
                  <input className="form-input" type="date" name="data_nascimento" value={form.data_nascimento} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input className="form-input" name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" name="telefone" value={form.telefone} onChange={handleChange} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
                <div className="form-group">
                  <label className="form-label">Turma</label>
                  <select className="form-select" name="turma_id" value={form.turma_id} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Endereço</label>
                  <input className="form-input" name="endereco" value={form.endereco} onChange={handleChange} placeholder="Rua, número, bairro, cidade" />
                </div>
              </div>

              {/* Acesso ao sistema */}
              <div style={{ borderTop:'1px solid var(--gray-100)', margin:'20px 0 16px', paddingTop:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                  Acesso ao sistema <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(opcional)</span>
                </div>
                <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:14 }}>
                  Preencha para que o aluno possa fazer login. Pode ser configurado depois.
                </p>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">E-mail de acesso</label>
                  <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@exemplo.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">{editando ? 'Nova senha (deixe vazio para manter)' : 'Senha de acesso'}</label>
                  <input className="form-input" type="password" name="senha" value={form.senha} onChange={handleChange} placeholder={editando ? 'Deixe vazio para não alterar' : 'Mínimo 6 caracteres'} />
                </div>
              </div>

              {!temAuth && (
                <div style={{ padding:'10px 14px', background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, fontSize:12, color:'#92400e', marginTop:8 }}>
                  ⚠️ Configure <strong>VITE_SUPABASE_SERVICE_ROLE_KEY</strong> no .env para habilitar criação de acesso automática.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? '✓ Salvar alterações' : '+ Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
