import { useEffect, useState } from 'react';
import { notasService, alunosService, turmasService, frequenciaService } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { gerarBoletimPDF } from '../services/boletimPDF';

const DISCIPLINAS  = ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Física', 'Química', 'Biologia', 'Inglês', 'Educação Física'];
const BIMESTRES    = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
const FORM_INICIAL = { aluno_id: '', turma_id: '', disciplina: '', bimestre: '1º Bimestre', nota: '' };

function calcularMedia(notas) {
  if (!notas.length) return null;
  return (notas.reduce((s, n) => s + parseFloat(n.nota), 0) / notas.length).toFixed(1);
}
function situacao(media) {
  if (media === null) return null;
  return parseFloat(media) >= 6 ? 'Aprovado' : 'Reprovado';
}
function corNota(nota) {
  const n = parseFloat(nota);
  if (n >= 7) return 'var(--green)';
  if (n >= 5) return 'var(--amber)';
  return 'var(--rose)';
}

export default function Notas() {
  const { perfil, user } = useAuth();
  const isAdmin     = perfil === 'admin';
  const isProfessor = perfil === 'professor';
  const isAluno     = perfil === 'aluno';

  const [notas, setNotas]             = useState([]);
  const [alunos, setAlunos]           = useState([]);
  const [turmas, setTurmas]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editando, setEditando]       = useState(null);
  const [form, setForm]               = useState(FORM_INICIAL);
  const [salvando, setSalvando]       = useState(false);
  const [erro, setErro]               = useState('');
  const [filtroAluno, setFiltroAluno] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [meuAlunoId, setMeuAlunoId]   = useState(null);
  const [gerandoPDF, setGerandoPDF]   = useState(null); // id do aluno sendo gerado

  const carregar = async () => {
    setLoading(true);
    try {
      const [n, a, t] = await Promise.all([notasService.listar(), alunosService.listar(), turmasService.listar()]);
      if (isAluno) {
        const me = a.find(al => al.email === user?.email);
        if (me) { setMeuAlunoId(me.id); setNotas(n.filter(nota => nota.aluno_id === me.id)); }
        else setNotas([]);
      } else {
        setNotas(n);
      }
      setAlunos(a); setTurmas(t);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  // ── Gerar boletim PDF ──────────────────────────────────────
  const gerarBoletim = async (alunoId) => {
    setGerandoPDF(alunoId);
    try {
      const aluno      = alunos.find(a => a.id === alunoId);
      const turma      = turmas.find(t => t.id === aluno?.turma_id);
      const notasAluno = notas.filter(n => n.aluno_id === alunoId);
      const freq       = await frequenciaService.relatorio(alunoId);

      gerarBoletimPDF({
        aluno,
        turma,
        notas: notasAluno,
        frequencia: freq,
        nomeEscola: 'EduGest Escola'
      });
    } catch (e) {
      alert('Erro ao gerar PDF: ' + e.message);
    } finally {
      setGerandoPDF(null);
    }
  };

  const abrirModal = (nota = null) => {
    setEditando(nota);
    setForm(nota ? { ...nota, nota: nota.nota?.toString() } : FORM_INICIAL);
    setErro(''); setModalOpen(true);
  };
  const fecharModal  = () => { setModalOpen(false); setEditando(null); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const salvar = async () => {
    if (!form.aluno_id || !form.disciplina || form.nota === '') { setErro('Preencha aluno, disciplina e nota.'); return; }
    const n = parseFloat(form.nota);
    if (isNaN(n) || n < 0 || n > 10) { setErro('Nota deve ser entre 0 e 10.'); return; }
    setSalvando(true); setErro('');
    try {
      const payload = { ...form, nota: n };
      if (editando) await notasService.atualizar(editando.id, payload);
      else await notasService.lancar(payload);
      await carregar(); fecharModal();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir esta nota?')) return;
    try { await notasService.excluir(id); setNotas(n => n.filter(x => x.id !== id)); }
    catch (e) { alert(e.message); }
  };

  const filtradas = notas.filter(n => {
    const matchAluno = !filtroAluno || n.aluno_id === filtroAluno;
    const matchDisc  = !filtroDisciplina || n.disciplina === filtroDisciplina;
    return matchAluno && matchDisc;
  });

  const alunosParaResumo = isAluno
    ? alunos.filter(a => a.id === meuAlunoId)
    : alunos.filter(a => filtroAluno ? a.id === filtroAluno : true);

  const resumoPorAluno = alunosParaResumo.map(a => {
    const notasAluno = notas.filter(n => n.aluno_id === a.id && (!filtroDisciplina || n.disciplina === filtroDisciplina));
    const media = calcularMedia(notasAluno);
    return { ...a, notasAluno, media, situacao: situacao(media) };
  }).filter(a => a.notasAluno.length > 0);

  // ── LAYOUT ALUNO ──────────────────────────────────────────
  if (isAluno) {
    if (loading) return <div className="loading-container"><div className="spinner" /></div>;
    return (
      <>
        {meuAlunoId === null && (
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            ℹ️ Seu cadastro de aluno ainda não foi vinculado a este email. Peça ao administrador para atualizar seu email no cadastro.
          </div>
        )}

        {resumoPorAluno.length > 0 && resumoPorAluno.map(a => (
          <div key={a.id} style={{ marginBottom: 24 }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{a.nome}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{a.turmas?.nome || 'Sem turma'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {a.situacao && (
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${a.situacao === 'Aprovado' ? 'badge-green' : 'badge-rose'}`} style={{ fontSize: 14, padding: '6px 16px' }}>
                        {a.situacao === 'Aprovado' ? '✓ Aprovado' : '✗ Reprovado'}
                      </span>
                      <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 6 }}>
                        Média: <strong style={{ color: corNota(a.media) }}>{a.media}</strong>
                      </div>
                    </div>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => gerarBoletim(a.id)}
                    disabled={gerandoPDF === a.id}
                    style={{ gap: 6 }}
                  >
                    {gerandoPDF === a.id ? '⏳ Gerando...' : '📄 Baixar Boletim'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {DISCIPLINAS.filter(d => a.notasAluno.some(n => n.disciplina === d)).map(disc => {
                const notasDisc = a.notasAluno.filter(n => n.disciplina === disc);
                const mediaDisc = calcularMedia(notasDisc);
                return (
                  <div key={disc} className="card">
                    <div className="card-body" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{disc}</span>
                        {mediaDisc && <span style={{ fontWeight: 700, fontSize: 20, color: corNota(mediaDisc) }}>{mediaDisc}</span>}
                      </div>
                      {notasDisc.map(n => (
                        <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 14 }}>
                          <span style={{ color: 'var(--gray-500)' }}>{n.bimestre}</span>
                          <span style={{ fontWeight: 600, color: corNota(n.nota) }}>{parseFloat(n.nota).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {resumoPorAluno.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>Nenhuma nota lançada ainda</h3>
            <p>Suas notas aparecerão aqui quando forem lançadas</p>
          </div>
        )}
      </>
    );
  }

  // ── LAYOUT ADMIN / PROFESSOR ──────────────────────────────
  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 240 }} value={filtroAluno} onChange={e => setFiltroAluno(e.target.value)}>
          <option value="">Todos os alunos</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select className="form-select" style={{ width: 200 }} value={filtroDisciplina} onChange={e => setFiltroDisciplina(e.target.value)}>
          <option value="">Todas as disciplinas</option>
          {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(isAdmin || isProfessor) && (
          <button className="btn btn-primary" onClick={() => abrirModal()}>+ Lançar Nota</button>
        )}
      </div>

      {resumoPorAluno.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
          {resumoPorAluno.map(a => (
            <div key={a.id} className="card">
              <div className="card-body" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', background: 'var(--teal-light)',
                      color: 'var(--teal-dark)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 700, fontSize: 15
                    }}>{a.nome?.[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{a.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{a.turmas?.nome || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    {a.situacao && (
                      <span className={`badge ${a.situacao === 'Aprovado' ? 'badge-green' : 'badge-rose'}`}>
                        {a.situacao === 'Aprovado' ? '✓' : '✗'} {a.situacao}
                      </span>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => gerarBoletim(a.id)}
                      disabled={gerandoPDF === a.id}
                      style={{ fontSize: 12 }}
                    >
                      {gerandoPDF === a.id ? '⏳' : '📄'} Boletim
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {a.notasAluno.map(n => (
                    <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{n.disciplina}</span>
                        <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>{n.bimestre}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: corNota(n.nota) }}>{parseFloat(n.nota).toFixed(1)}</span>
                        {(isAdmin || isProfessor) && <>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={() => abrirModal(n)}>✏️</button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '3px 8px' }} onClick={() => excluir(n.id)}>✕</button>
                        </>}
                      </div>
                    </div>
                  ))}
                </div>
                {a.media !== null && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Média geral</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: corNota(a.media) }}>{a.media}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Lançamentos ({filtradas.length})</h2>
        </div>
        <div className="table-container">
          {loading ? <div className="loading-container"><div className="spinner" /></div> :
            filtradas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h3>Nenhuma nota lançada</h3>
                <p>Clique em "Lançar Nota" para adicionar</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Aluno</th><th>Disciplina</th><th>Bimestre</th><th>Nota</th><th>Situação</th>
                    {(isAdmin || isProfessor) && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(n => (
                    <tr key={n.id}>
                      <td style={{ fontWeight: 500 }}>{n.alunos?.nome || '—'}</td>
                      <td><span className="badge badge-blue">{n.disciplina}</span></td>
                      <td style={{ color: 'var(--gray-500)' }}>{n.bimestre}</td>
                      <td><span style={{ fontWeight: 700, fontSize: 16, color: corNota(n.nota) }}>{parseFloat(n.nota).toFixed(1)}</span></td>
                      <td><span className={`badge ${parseFloat(n.nota) >= 6 ? 'badge-green' : 'badge-rose'}`}>{parseFloat(n.nota) >= 6 ? '✓ Aprovado' : '✗ Reprovado'}</span></td>
                      {(isAdmin || isProfessor) && (
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => abrirModal(n)}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => excluir(n.id)}>🗑️</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {modalOpen && (isAdmin || isProfessor) && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editando ? 'Editar Nota' : 'Lançar Nota'}</h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Aluno *</label>
                  <select className="form-select" name="aluno_id" value={form.aluno_id} onChange={handleChange}>
                    <option value="">Selecione o aluno...</option>
                    {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Turma</label>
                  <select className="form-select" name="turma_id" value={form.turma_id} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Disciplina *</label>
                  <select className="form-select" name="disciplina" value={form.disciplina} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bimestre</label>
                  <select className="form-select" name="bimestre" value={form.bimestre} onChange={handleChange}>
                    {BIMESTRES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nota (0–10) *</label>
                  <input className="form-input" type="number" name="nota" value={form.nota} onChange={handleChange} min={0} max={10} step={0.5} placeholder="Ex: 8.5" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? '✓ Salvar' : '+ Lançar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
