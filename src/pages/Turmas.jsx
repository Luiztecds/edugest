import { useEffect, useState } from 'react';
import { turmasService, professoresService, alunosService } from '../services/supabase';

const ANOS = ['2023', '2024', '2025', '2026'];
const SERIES = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano', '1º Ano EM', '2º Ano EM', '3º Ano EM'];
const FORM_INICIAL = { nome: '', serie: '', ano: new Date().getFullYear().toString(), professor_id: '' };

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detalheId, setDetalheId] = useState(null);
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([turmasService.listar(), professoresService.listar()]);
      setTurmas(t); setProfessores(p);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const verAlunos = async (turmaId) => {
    setDetalheId(turmaId);
    const alunos = await turmasService.alunosDaTurma(turmaId);
    setAlunosTurma(alunos);
  };

  const abrirModal = (t = null) => {
    setEditando(t); setForm(t ? { ...t } : FORM_INICIAL);
    setErro(''); setModalOpen(true);
  };

  const fecharModal = () => { setModalOpen(false); setEditando(null); };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const salvar = async () => {
    if (!form.nome) { setErro('Nome da turma é obrigatório.'); return; }
    setSalvando(true); setErro('');
    try {
      const payload = { ...form, professor_id: form.professor_id || null };
      if (editando) await turmasService.atualizar(editando.id, payload);
      else await turmasService.criar(payload);
      await carregar(); fecharModal();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir esta turma?')) return;
    try { await turmasService.excluir(id); setTurmas(t => t.filter(x => x.id !== id)); }
    catch (e) { alert(e.message); }
  };

  const turmaSelecionada = turmas.find(t => t.id === detalheId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: detalheId ? '1fr 340px' : '1fr', gap: 24 }}>
      <div className="card">
        <div className="card-header">
          <h2>Turmas ({turmas.length})</h2>
          <button className="btn btn-primary" onClick={() => abrirModal()}>+ Nova Turma</button>
        </div>
        <div className="table-container">
          {loading ? <div className="loading-container"><div className="spinner" /></div> :
            turmas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏫</div>
                <h3>Nenhuma turma cadastrada</h3>
                <p>Crie a primeira turma clicando em "Nova Turma"</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Série</th>
                    <th>Ano</th>
                    <th>Professor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {turmas.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                            background: 'var(--blue-light)', color: '#1d4ed8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, flexShrink: 0
                          }}>🏫</div>
                          <span style={{ fontWeight: 600 }}>{t.nome}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-blue">{t.serie || '—'}</span></td>
                      <td style={{ color: 'var(--gray-500)' }}>{t.ano || '—'}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{t.professores?.nome || '—'}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => verAlunos(t.id)}>👥 Alunos</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirModal(t)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => excluir(t.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {detalheId && turmaSelecionada && (
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <div>
              <h2>{turmaSelecionada.nome}</h2>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{alunosTurma.length} aluno(s)</p>
            </div>
            <button className="modal-close" onClick={() => setDetalheId(null)}>✕</button>
          </div>
          <div className="card-body" style={{ padding: '12px 0' }}>
            {alunosTurma.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div style={{ fontSize: 32 }}>👨‍🎓</div>
                <p style={{ marginTop: 8 }}>Nenhum aluno nesta turma</p>
              </div>
            ) : (
              alunosTurma.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', borderBottom: '1px solid var(--gray-100)'
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--teal-light)', color: 'var(--teal-dark)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13
                  }}>{a.nome?.[0]?.toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{a.email || '—'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editando ? 'Editar Turma' : 'Nova Turma'}</h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Nome da turma *</label>
                  <input className="form-input" name="nome" value={form.nome} onChange={handleChange} placeholder="Ex: 9º Ano A" />
                </div>
                <div className="form-group">
                  <label className="form-label">Série</label>
                  <select className="form-select" name="serie" value={form.serie} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ano letivo</label>
                  <select className="form-select" name="ano" value={form.ano} onChange={handleChange}>
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Professor responsável</label>
                  <select className="form-select" name="professor_id" value={form.professor_id} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {professores.map(p => <option key={p.id} value={p.id}>{p.nome} — {p.disciplina}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? '✓ Salvar' : '+ Criar Turma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
