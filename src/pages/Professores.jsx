import { useEffect, useState } from 'react';
import { professoresService } from '../services/supabase';

const DISCIPLINAS = ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Física', 'Química', 'Biologia', 'Inglês', 'Educação Física', 'Arte', 'Filosofia', 'Sociologia'];
const FORM_INICIAL = { nome: '', disciplina: '', email: '', telefone: '' };

function maskTel(v) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
}

export default function Professores() {
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    setLoading(true);
    try { setProfessores(await professoresService.listar()); }
    catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirModal = (p = null) => {
    setEditando(p); setForm(p ? { ...p } : FORM_INICIAL);
    setErro(''); setModalOpen(true);
  };

  const fecharModal = () => { setModalOpen(false); setEditando(null); };

  const handleChange = e => {
    const { name, value } = e.target;
    const v = name === 'telefone' ? maskTel(value) : value;
    setForm(f => ({ ...f, [name]: v }));
  };

  const salvar = async () => {
    if (!form.nome) { setErro('Nome é obrigatório.'); return; }
    setSalvando(true); setErro('');
    try {
      if (editando) await professoresService.atualizar(editando.id, form);
      else await professoresService.criar(form);
      await carregar(); fecharModal();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este professor?')) return;
    try { await professoresService.excluir(id); setProfessores(p => p.filter(x => x.id !== id)); }
    catch (e) { alert(e.message); }
  };

  const filtrados = professores.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.disciplina?.toLowerCase().includes(busca.toLowerCase())
  );

  const corDisciplina = (d) => {
    const cores = {
      'Matemática': 'badge-blue', 'Física': 'badge-blue', 'Química': 'badge-rose',
      'Biologia': 'badge-green', 'Ciências': 'badge-green', 'Português': 'badge-amber',
      'História': 'badge-amber', 'Geografia': 'badge-teal', 'Inglês': 'badge-teal',
    };
    return cores[d] || 'badge-gray';
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>Professores ({filtrados.length})</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="search-bar">
              <span>🔍</span>
              <input placeholder="Buscar professor..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => abrirModal()}>+ Novo Professor</button>
          </div>
        </div>
        <div className="table-container">
          {loading ? <div className="loading-container"><div className="spinner" /></div> :
            filtrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🏫</div>
                <h3>Nenhum professor cadastrado</h3>
                <p>Adicione professores clicando em "Novo Professor"</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Disciplina</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'var(--amber-light)', color: '#92400e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 14, flexShrink: 0
                          }}>{p.nome?.[0]?.toUpperCase()}</div>
                          <span style={{ fontWeight: 500 }}>{p.nome}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${corDisciplina(p.disciplina)}`}>{p.disciplina || '—'}</span></td>
                      <td style={{ color: 'var(--gray-500)' }}>{p.email || '—'}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{p.telefone || '—'}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirModal(p)}>✏️ Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => excluir(p.id)}>🗑️</button>
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
              <h2>{editando ? 'Editar Professor' : 'Novo Professor'}</h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Nome completo *</label>
                  <input className="form-input" name="nome" value={form.nome} onChange={handleChange} placeholder="Nome do professor" />
                </div>
                <div className="form-group">
                  <label className="form-label">Disciplina</label>
                  <select className="form-select" name="disciplina" value={form.disciplina} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@escola.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" name="telefone" value={form.telefone} onChange={handleChange} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? '✓ Salvar' : '+ Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
