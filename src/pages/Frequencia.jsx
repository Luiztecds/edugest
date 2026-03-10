import { useEffect, useState } from 'react';
import { frequenciaService, alunosService, turmasService } from '../services/supabase';

export default function Frequencia() {
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const hoje = new Date().toISOString().split('T')[0];
  const [data, setData] = useState(hoje);
  const [turmaId, setTurmaId] = useState('');
  const [presencas, setPresencas] = useState({});
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [aba, setAba] = useState('registrar');
  const [filtroAlunoHist, setFiltroAlunoHist] = useState('');

  useEffect(() => {
    Promise.all([alunosService.listar(), turmasService.listar()])
      .then(([a, t]) => { setAlunos(a); setTurmas(t); })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!turmaId) { setAlunosTurma([]); setPresencas({}); return; }
    const at = alunos.filter(a => a.turma_id === turmaId);
    setAlunosTurma(at);
    const p = {};
    at.forEach(a => p[a.id] = 'presente');
    setPresencas(p);
  }, [turmaId, alunos]);

  const carregarHistorico = async () => {
    try {
      const filtros = {};
      if (filtroAlunoHist) filtros.aluno_id = filtroAlunoHist;
      if (turmaId) filtros.turma_id = turmaId;
      const h = await frequenciaService.listar(filtros);
      setHistorico(h);
    } catch (e) { setErro(e.message); }
  };

  useEffect(() => { if (aba === 'historico') carregarHistorico(); }, [aba, filtroAlunoHist, turmaId]);

  const togglePresenca = (alunoId) => {
    setPresencas(p => ({
      ...p,
      [alunoId]: p[alunoId] === 'presente' ? 'falta' : 'presente'
    }));
  };

  const salvar = async () => {
    if (!turmaId || !data || alunosTurma.length === 0) {
      setErro('Selecione turma, data e certifique-se que há alunos.'); return;
    }
    setSalvando(true); setErro(''); setSucesso('');
    try {
      const registros = alunosTurma.map(a => ({
        aluno_id: a.id,
        turma_id: turmaId,
        data,
        status: presencas[a.id] || 'falta'
      }));
      await frequenciaService.registrar(registros);
      setSucesso(`Frequência do dia ${data} registrada com sucesso!`);
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const presentes = alunosTurma.filter(a => presencas[a.id] === 'presente').length;
  const faltas = alunosTurma.length - presentes;

  // Calcular % frequencia por aluno
  const calcFreq = (alunoId) => {
    const registrosAluno = historico.filter(h => h.aluno_id === alunoId);
    if (!registrosAluno.length) return null;
    const pct = (registrosAluno.filter(h => h.status === 'presente').length / registrosAluno.length * 100).toFixed(0);
    return pct;
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="tabs">
          <button className={`tab-btn ${aba === 'registrar' ? 'active' : ''}`} onClick={() => setAba('registrar')}>📅 Registrar Chamada</button>
          <button className={`tab-btn ${aba === 'historico' ? 'active' : ''}`} onClick={() => setAba('historico')}>📊 Histórico</button>
        </div>
      </div>

      {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}
      {sucesso && <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {sucesso}</div>}

      {aba === 'registrar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <h2>Chamada do Dia</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <input className="form-input" type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: 160 }} />
                <select className="form-select" value={turmaId} onChange={e => setTurmaId(e.target.value)} style={{ width: 200 }}>
                  <option value="">Selecione a turma...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>
            <div>
              {!turmaId ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <h3>Selecione uma turma</h3>
                  <p>Escolha a turma para registrar a chamada</p>
                </div>
              ) : alunosTurma.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <h3>Turma sem alunos</h3>
                  <p>Cadastre alunos nesta turma primeiro</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: '8px 16px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{alunosTurma.length} alunos</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { const p = {}; alunosTurma.forEach(a => p[a.id] = 'presente'); setPresencas(p); }}>✓ Todos presentes</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { const p = {}; alunosTurma.forEach(a => p[a.id] = 'falta'); setPresencas(p); }}>✗ Todos ausentes</button>
                    </div>
                  </div>
                  {alunosTurma.map((a, i) => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderBottom: i < alunosTurma.length - 1 ? '1px solid var(--gray-100)' : 'none',
                      background: presencas[a.id] === 'falta' ? 'rgba(244,63,94,0.03)' : 'white'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: presencas[a.id] === 'presente' ? 'var(--teal-light)' : 'var(--rose-light)',
                          color: presencas[a.id] === 'presente' ? 'var(--teal-dark)' : 'var(--rose)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14, transition: 'all 0.2s'
                        }}>{a.nome?.[0]?.toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{a.nome}</span>
                      </div>
                      <button
                        onClick={() => togglePresenca(a.id)}
                        style={{
                          padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                          background: presencas[a.id] === 'presente' ? 'var(--teal-light)' : 'var(--rose-light)',
                          color: presencas[a.id] === 'presente' ? 'var(--teal-dark)' : 'var(--rose)'
                        }}
                      >
                        {presencas[a.id] === 'presente' ? '✓ Presente' : '✗ Falta'}
                      </button>
                    </div>
                  ))}
                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                      {salvando ? 'Salvando...' : '✓ Salvar Chamada'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-body" style={{ padding: 20 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Resumo do Dia</h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, background: 'var(--teal-light)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--teal-dark)' }}>{presentes}</div>
                    <div style={{ fontSize: 13, color: 'var(--teal-dark)', marginTop: 4 }}>Presentes</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--rose-light)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--rose)' }}>{faltas}</div>
                    <div style={{ fontSize: 13, color: 'var(--rose)', marginTop: 4 }}>Faltas</div>
                  </div>
                </div>
                {alunosTurma.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--gray-500)' }}>Taxa de presença</span>
                      <span style={{ fontWeight: 700 }}>{Math.round(presentes / alunosTurma.length * 100)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill green" style={{ width: `${presentes / alunosTurma.length * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {aba === 'historico' && (
        <div className="card">
          <div className="card-header">
            <h2>Histórico de Frequência</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <select className="form-select" value={filtroAlunoHist} onChange={e => setFiltroAlunoHist(e.target.value)} style={{ width: 220 }}>
                <option value="">Todos os alunos</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="table-container">
            {historico.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3>Nenhum registro encontrado</h3>
                <p>Registre chamadas para ver o histórico</p>
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Aluno</th><th>Data</th><th>Turma</th><th>Status</th></tr></thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{h.alunos?.nome || '—'}</td>
                      <td style={{ color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                        {new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td><span className="badge badge-gray">{h.turmas?.nome || '—'}</span></td>
                      <td>
                        <span className={`badge ${h.status === 'presente' ? 'badge-green' : 'badge-rose'}`}>
                          {h.status === 'presente' ? '✓ Presente' : '✗ Falta'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
