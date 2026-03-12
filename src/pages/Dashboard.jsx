import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { dashboardService, alunosService, notasService, frequenciaService, turmasService, avisosService } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
const DISCIPLINAS = ['Matemática', 'Português', 'História', 'Ciências', 'Inglês', 'Física', 'Química', 'Biologia'];

const COR_TEAL  = '#00c9b1';
const COR_AMBER = '#f59e0b';
const COR_ROSE  = '#f43f5e';
const COR_BLUE  = '#3b82f6';
const COR_GREEN = '#10b981';
const COR_NAVY  = '#1a2f4a';

const CORES_BAR = [COR_TEAL, COR_BLUE, COR_AMBER, COR_GREEN, COR_ROSE, '#8b5cf6', '#ec4899', '#14b8a6'];

// Tooltip customizado
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', border: '1px solid var(--gray-200)',
      borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      fontSize: 13
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--gray-700)' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ color: 'var(--gray-500)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const TIPOS_AVISO = {
  geral:    { cor: '#3b82f6', bg: '#dbeafe', icon: '📢' },
  urgente:  { cor: '#f43f5e', bg: '#ffe4e9', icon: '🚨' },
  evento:   { cor: '#8b5cf6', bg: '#ede9fe', icon: '🎉' },
  feriado:  { cor: '#f59e0b', bg: '#fef3c7', icon: '🗓️' },
};

function AvisosWidget({ avisos }) {
  if (!avisos || avisos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--gray-400)', fontSize: 13 }}>
        Nenhum aviso publicado
      </div>
    );
  }
  return avisos.map(a => {
    const t = TIPOS_AVISO[a.tipo] || TIPOS_AVISO.geral;
    return (
      <div key={a.id} style={{
        padding: '12px 14px', borderRadius: 8,
        background: t.bg, borderLeft: `3px solid ${t.cor}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span>{t.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>{a.titulo}</span>
          {a.fixado && <span style={{ fontSize: 10, marginLeft: 'auto', color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>📌 Fixado</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 6, lineHeight: 1.5 }}>{a.conteudo?.slice(0, 100)}{a.conteudo?.length > 100 ? '...' : ''}</div>
        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
          {a.autor_nome || 'Sistema'} · {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </div>
      </div>
    );
  });
}

export default function Dashboard() {
  const { perfil, user } = useAuth();
  const isAluno     = perfil === 'aluno';
  const isProfessor = perfil === 'professor';

  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ totalAlunos: 0, totalProfessores: 0, totalTurmas: 0 });
  const [avisosRecentes, setAvisosRecentes] = useState([]);

  // Dados dos gráficos
  const [mediaPorBimestre, setMediaPorBimestre]         = useState([]);
  const [mediaPorDisciplina, setMediaPorDisciplina]     = useState([]);
  const [frequenciaPorTurma, setFrequenciaPorTurma]     = useState([]);
  const [distribuicaoNotas, setDistribuicaoNotas]       = useState([]);
  const [recentAlunos, setRecentAlunos]                 = useState([]);

  // Para aluno: dados pessoais
  const [meuBoletim, setMeuBoletim]   = useState([]);
  const [minhaFreq, setMinhaFreq]     = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      if (isAluno) {
        await carregarDadosAluno();
      } else {
        await carregarDadosAdmin();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function carregarDadosAluno() {
    const [alunos, notas, freq, avisos] = await Promise.all([
      alunosService.listar(),
      notasService.listar(),
      frequenciaService.listar(),
      avisosService.listar(),
    ]);

    const me = alunos.find(a => a.email === user?.email);
    if (!me) { setAvisosRecentes(avisos.slice(0, 4)); return; }
    setAvisosRecentes(avisos.slice(0, 4));

    const minhasNotas = notas.filter(n => n.aluno_id === me.id);
    const minhaFreqData = freq.filter(f => f.aluno_id === me.id);

    // Média por bimestre (pessoal)
    const porBimestre = BIMESTRES.map(b => {
      const notasBim = minhasNotas.filter(n => n.bimestre === b);
      const media = notasBim.length
        ? (notasBim.reduce((s, n) => s + parseFloat(n.nota), 0) / notasBim.length).toFixed(1)
        : null;
      return { bimestre: b.replace('º Bimestre', 'º Bim'), media: media ? parseFloat(media) : null };
    }).filter(b => b.media !== null);

    // Notas por disciplina (pessoal)
    const porDisc = DISCIPLINAS.map(d => {
      const nd = minhasNotas.filter(n => n.disciplina === d);
      if (!nd.length) return null;
      const media = (nd.reduce((s, n) => s + parseFloat(n.nota), 0) / nd.length).toFixed(1);
      return { disciplina: d.substring(0, 7), media: parseFloat(media), full: d };
    }).filter(Boolean);

    // Frequência pessoal
    const total    = minhaFreqData.length;
    const presente = minhaFreqData.filter(f => f.status === 'presente').length;
    const pct      = total > 0 ? Math.round(presente / total * 100) : null;

    setMediaPorBimestre(porBimestre);
    setMediaPorDisciplina(porDisc);
    setMinhaFreq({ total, presente, faltas: total - presente, pct });
  }

  async function carregarDadosAdmin() {
    const [s, alunos, todasNotas, todasFreq, turmas, avisos] = await Promise.all([
      dashboardService.estatisticas(),
      alunosService.listar(),
      notasService.listar(),
      frequenciaService.listar(),
      turmasService.listar(),
      avisosService.listar(),
    ]);

    setStats(s);
    setRecentAlunos(alunos.slice(0, 5));
    setAvisosRecentes(avisos.slice(0, 4));

    // Média por bimestre (global)
    const porBimestre = BIMESTRES.map(b => {
      const nb = todasNotas.filter(n => n.bimestre === b);
      const media = nb.length
        ? parseFloat((nb.reduce((s, n) => s + parseFloat(n.nota), 0) / nb.length).toFixed(1))
        : null;
      return { bimestre: b.replace('º Bimestre', 'º Bim'), media };
    }).filter(b => b.media !== null);
    setMediaPorBimestre(porBimestre);

    // Média por disciplina (global)
    const porDisc = DISCIPLINAS.map(d => {
      const nd = todasNotas.filter(n => n.disciplina === d);
      if (!nd.length) return null;
      const media = parseFloat((nd.reduce((s, n) => s + parseFloat(n.nota), 0) / nd.length).toFixed(1));
      return { disciplina: d.substring(0, 7), media, full: d };
    }).filter(Boolean);
    setMediaPorDisciplina(porDisc);

    // Frequência por turma
    const porTurma = turmas.map(t => {
      const alunosDaTurma = alunos.filter(a => a.turma_id === t.id).map(a => a.id);
      const freqTurma     = todasFreq.filter(f => alunosDaTurma.includes(f.aluno_id));
      const total    = freqTurma.length;
      const presente = freqTurma.filter(f => f.status === 'presente').length;
      const pct      = total > 0 ? Math.round(presente / total * 100) : 0;
      return { turma: t.nome, frequencia: pct };
    }).filter(t => t.frequencia > 0);
    setFrequenciaPorTurma(porTurma);

    // Distribuição de notas (faixas)
    const faixas = [
      { faixa: '0–4', count: todasNotas.filter(n => parseFloat(n.nota) < 4).length, cor: COR_ROSE },
      { faixa: '4–6', count: todasNotas.filter(n => parseFloat(n.nota) >= 4 && parseFloat(n.nota) < 6).length, cor: COR_AMBER },
      { faixa: '6–8', count: todasNotas.filter(n => parseFloat(n.nota) >= 6 && parseFloat(n.nota) < 8).length, cor: COR_TEAL },
      { faixa: '8–10', count: todasNotas.filter(n => parseFloat(n.nota) >= 8).length, cor: COR_GREEN },
    ].filter(f => f.count > 0);
    setDistribuicaoNotas(faixas);
  }

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" />
      <span style={{ color: 'var(--gray-500)' }}>Carregando dashboard...</span>
    </div>
  );

  // ── LAYOUT ALUNO ──────────────────────────────────────────
  if (isAluno) {
    const corFreq = minhaFreq?.pct >= 75 ? COR_GREEN : minhaFreq?.pct >= 50 ? COR_AMBER : COR_ROSE;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stats pessoais */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon teal">📝</div>
            <div className="stat-info">
              <div className="stat-value">{mediaPorDisciplina.length}</div>
              <div className="stat-label">Disciplinas com nota</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">⭐</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: mediaPorDisciplina.length ? undefined : 'var(--gray-400)' }}>
                {mediaPorDisciplina.length
                  ? (mediaPorDisciplina.reduce((s, d) => s + d.media, 0) / mediaPorDisciplina.length).toFixed(1)
                  : '—'}
              </div>
              <div className="stat-label">Média geral</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">📅</div>
            <div className="stat-info">
              <div className="stat-value">{minhaFreq?.pct != null ? `${minhaFreq.pct}%` : '—'}</div>
              <div className="stat-label">Frequência</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">✗</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: (minhaFreq?.faltas || 0) > 0 ? COR_ROSE : 'inherit' }}>
                {minhaFreq?.faltas ?? '—'}
              </div>
              <div className="stat-label">Faltas</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Evolução por bimestre */}
          <div className="card">
            <div className="card-header"><h2>Evolução por Bimestre</h2></div>
            <div className="card-body">
              {mediaPorBimestre.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div style={{ fontSize: 32 }}>📊</div>
                  <p style={{ marginTop: 8 }}>Nenhuma nota lançada</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={mediaPorBimestre} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COR_TEAL} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COR_TEAL} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="bimestre" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="media" name="Média" stroke={COR_TEAL} strokeWidth={2.5} fill="url(#gradTeal)" dot={{ fill: COR_TEAL, r: 4 }} activeDot={{ r: 6 }} />
                    {/* Linha de aprovação */}
                    <CartesianGrid strokeDasharray="0" stroke="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Nota por disciplina */}
          <div className="card">
            <div className="card-header"><h2>Média por Disciplina</h2></div>
            <div className="card-body">
              {mediaPorDisciplina.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div style={{ fontSize: 32 }}>📚</div>
                  <p style={{ marginTop: 8 }}>Nenhuma nota lançada</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mediaPorDisciplina} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="disciplina" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="media" name="Média" radius={[4, 4, 0, 0]}>
                      {mediaPorDisciplina.map((d, i) => (
                        <Cell key={i} fill={parseFloat(d.media) >= 6 ? COR_TEAL : COR_ROSE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Frequência pessoal */}
        {minhaFreq && (
          <div className="card">
            <div className="card-header"><h2>Minha Frequência</h2></div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                  <ResponsiveContainer width={120} height={120}>
                    <RadialBarChart cx={60} cy={60} innerRadius={38} outerRadius={54} data={[{ value: minhaFreq.pct, fill: corFreq }]} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: corFreq }}>{minhaFreq.pct}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, flex: 1 }}>
                  {[
                    { label: 'Total de Aulas', val: minhaFreq.total, cor: 'var(--gray-700)' },
                    { label: 'Presenças', val: minhaFreq.presente, cor: COR_GREEN },
                    { label: 'Faltas', val: minhaFreq.faltas, cor: COR_ROSE },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: item.cor }}>{item.val}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{item.label}</div>
                    </div>
                  ))}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      padding: '10px 16px', borderRadius: 8,
                      background: minhaFreq.pct >= 75 ? 'var(--green-light)' : 'var(--rose-light)',
                      color: minhaFreq.pct >= 75 ? '#065f46' : '#be123c',
                      fontSize: 13, fontWeight: 600
                    }}>
                      {minhaFreq.pct >= 75 ? '✓ Frequência regular' : '⚠️ Frequência irregular — mínimo exigido: 75%'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Avisos */}
        <div className="card">
          <div className="card-header">
            <h2>Avisos da Escola</h2>
            <a href="/avisos" style={{ fontSize: 13, color: 'var(--teal-dark)', fontWeight: 600 }}>Ver todos →</a>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AvisosWidget avisos={avisosRecentes} />
          </div>
        </div>
      </div>
    );
  }

  // ── LAYOUT ADMIN / PROFESSOR ──────────────────────────────
  const aprovados   = distribuicaoNotas.filter(f => ['6–8', '8–10'].includes(f.faixa)).reduce((s, f) => s + f.count, 0);
  const reprovados  = distribuicaoNotas.filter(f => ['0–4', '4–6'].includes(f.faixa)).reduce((s, f) => s + f.count, 0);
  const totalNotas  = aprovados + reprovados;
  const pctAprov    = totalNotas > 0 ? Math.round(aprovados / totalNotas * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon teal">👨‍🎓</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalAlunos}</div>
            <div className="stat-label">Total de Alunos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">👨‍🏫</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalProfessores}</div>
            <div className="stat-label">Professores</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🏫</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalTurmas}</div>
            <div className="stat-label">Turmas Ativas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✓</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: pctAprov >= 70 ? COR_GREEN : COR_AMBER }}>{pctAprov}%</div>
            <div className="stat-label">Taxa de Aprovação</div>
          </div>
        </div>
      </div>

      {/* Gráficos linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Média por bimestre */}
        <div className="card">
          <div className="card-header">
            <h2>Evolução das Notas</h2>
            <span className="badge badge-gray">por bimestre</span>
          </div>
          <div className="card-body">
            {mediaPorBimestre.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div style={{ fontSize: 32 }}>📈</div>
                <p style={{ marginTop: 8 }}>Lance notas para ver a evolução</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={mediaPorBimestre} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTeal2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COR_TEAL} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COR_TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bimestre" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="media" name="Média Geral" stroke={COR_TEAL} strokeWidth={2.5} fill="url(#gradTeal2)" dot={{ fill: COR_TEAL, r: 5 }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribuição de notas */}
        <div className="card">
          <div className="card-header">
            <h2>Distribuição de Notas</h2>
            <span className="badge badge-gray">todas as turmas</span>
          </div>
          <div className="card-body">
            {distribuicaoNotas.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div style={{ fontSize: 32 }}>📊</div>
                <p style={{ marginTop: 8 }}>Nenhuma nota lançada ainda</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={distribuicaoNotas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="faixa" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Alunos" radius={[6, 6, 0, 0]}>
                      {distribuicaoNotas.map((d, i) => <Cell key={i} fill={d.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COR_GREEN }} />
                    <span style={{ color: 'var(--gray-600)' }}>Aprovados: <strong style={{ color: COR_GREEN }}>{pctAprov}%</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COR_ROSE }} />
                    <span style={{ color: 'var(--gray-600)' }}>Reprovados: <strong style={{ color: COR_ROSE }}>{100 - pctAprov}%</strong></span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos linha 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Média por disciplina */}
        <div className="card">
          <div className="card-header">
            <h2>Desempenho por Disciplina</h2>
          </div>
          <div className="card-body">
            {mediaPorDisciplina.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div style={{ fontSize: 32 }}>📚</div>
                <p style={{ marginTop: 8 }}>Lance notas para ver o desempenho</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={mediaPorDisciplina} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="disciplina" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="media" name="Média" radius={[0, 4, 4, 0]}>
                    {mediaPorDisciplina.map((d, i) => (
                      <Cell key={i} fill={CORES_BAR[i % CORES_BAR.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Frequência por turma */}
        <div className="card">
          <div className="card-header">
            <h2>Frequência por Turma</h2>
            <span className="badge badge-gray">% de presença</span>
          </div>
          <div className="card-body">
            {frequenciaPorTurma.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div style={{ fontSize: 32 }}>📅</div>
                <p style={{ marginTop: 8 }}>Registre chamadas para ver frequência</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {frequenciaPorTurma.map((t, i) => {
                  const cor = t.frequencia >= 75 ? COR_GREEN : t.frequencia >= 50 ? COR_AMBER : COR_ROSE;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{t.turma}</span>
                        <span style={{ fontWeight: 700, color: cor }}>{t.frequencia}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 8 }}>
                        <div className="progress-fill" style={{
                          width: `${t.frequencia}%`,
                          background: cor,
                          borderRadius: 99,
                          transition: 'width 0.8s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                  🟢 ≥75% regular · 🟡 50–74% atenção · 🔴 &lt;50% crítico
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha 3: Alunos recentes + Avisos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h2>Alunos Recentes</h2>
            <span className="badge badge-teal">{stats.totalAlunos} total</span>
          </div>
          {recentAlunos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🎓</div>
              <h3>Nenhum aluno cadastrado</h3>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Turma</th><th>Email</th></tr>
              </thead>
              <tbody>
                {recentAlunos.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--teal-light)', color: 'var(--teal-dark)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, flexShrink: 0
                        }}>{a.nome?.[0]?.toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{a.nome}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-gray">{a.turmas?.nome || '—'}</span></td>
                    <td style={{ color: 'var(--gray-500)' }}>{a.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Avisos</h2>
            <a href="/avisos" style={{ fontSize: 13, color: 'var(--teal-dark)', fontWeight: 600 }}>Ver todos →</a>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AvisosWidget avisos={avisosRecentes} />
          </div>
        </div>
      </div>
    </div>
  );
}
