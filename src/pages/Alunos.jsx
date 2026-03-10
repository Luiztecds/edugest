import { useEffect, useState } from 'react';
import { alunosService, turmasService } from '../services/supabase';

const FORM_INICIAL = {
  nome: '', data_nascimento: '', cpf: '', email: '', telefone: '', endereco: '', turma_id: ''
};

function maskCPF(v) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14);
}

function maskTel(v) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
}

export default function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

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
    setForm(aluno ? { ...aluno } : FORM_INICIAL);
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
    setSalvando(true); setErro('');
    try {
      const payload = { ...form, turma_id: form.turma_id || null };
      if (editando) {
        await alunosService.atualizar(editando.id, payload);
      } else {
        await alunosService.criar(payload);
      }
      await carregar();
      fecharModal();
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

  return (
    <>
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
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Turma</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--teal-light)', color: 'var(--teal-dark)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14, flexShrink: 0
                        }}>{a.nome?.[0]?.toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{a.nome}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontFamily: 'monospace' }}>{a.cpf || '—'}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{a.email || '—'}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{a.telefone || '—'}</td>
                    <td>{a.turmas?.nome ? <span className="badge badge-teal">{a.turmas.nome}</span> : <span className="badge badge-gray">—</span>}</td>
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
          <div className="modal">
            <div className="modal-header">
              <h2>{editando ? 'Editar Aluno' : 'Novo Aluno'}</h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}
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
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@exemplo.com" />
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
