import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin, avisosService, turmasService } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const TIPOS_AVISO = {
  geral:   { cor: '#3b82f6', bg: '#dbeafe', icon: '📢' },
  urgente: { cor: '#f43f5e', bg: '#ffe4e9', icon: '🚨' },
  evento:  { cor: '#8b5cf6', bg: '#ede9fe', icon: '🎉' },
  feriado: { cor: '#f59e0b', bg: '#fef3c7', icon: '🗓️' },
};

function AvisosWidget({ avisos }) {
  if (!avisos?.length) return (
    <div style={{ textAlign:'center', padding:'20px 0', color:'var(--gray-400)', fontSize:13 }}>
      Nenhum aviso publicado
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {avisos.map(a => {
        const t = TIPOS_AVISO[a.tipo] || TIPOS_AVISO.geral;
        return (
          <div key={a.id} style={{ padding:'12px 14px', borderRadius:8, background:t.bg, borderLeft:`3px solid ${t.cor}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <span>{t.icon}</span>
              <span style={{ fontWeight:700, fontSize:14, color:'var(--gray-800)' }}>{a.titulo}</span>
              {a.fixado && <span style={{ fontSize:10, marginLeft:'auto', color:'#92400e', background:'#fef3c7', padding:'1px 6px', borderRadius:99, fontWeight:700 }}>📌 Fixado</span>}
            </div>
            <div style={{ fontSize:13, color:'var(--gray-600)', marginBottom:5, lineHeight:1.5 }}>
              {a.conteudo?.slice(0,100)}{a.conteudo?.length > 100 ? '...' : ''}
            </div>
            <div style={{ fontSize:11, color:'var(--gray-400)' }}>
              {a.autor_nome || 'Sistema'} · {new Date(a.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard do Admin ────────────────────────────────────────
function DashboardAdmin() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ alunos:0, professores:0, turmas:0, avisos:0 });
  const [avisos, setAvisos]   = useState([]);
  const [turmas, setTurmas]   = useState([]);
  const [usuariosRecentes, setUsuariosRecentes] = useState([]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try {
      // Busca turmas e avisos (sem admin key)
      const [turmasData, avisosData] = await Promise.all([
        turmasService.listar().catch(() => []),
        avisosService.listarTodos().catch(() => []),
      ]);

      setAvisos(avisosData.slice(0, 4));
      setTurmas(turmasData.slice(0, 5));

      // Conta direto das tabelas alunos e professores
      const [alunosCount, professoresCount] = await Promise.all([
        supabase.from('alunos').select('id', { count: 'exact', head: true }),
        supabase.from('professores').select('id', { count: 'exact', head: true }),
      ]);

      // Busca últimos usuários do Auth para a tabela
      let recentes = [];
      if (supabaseAdmin) {
        try {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const users = usersData?.users || [];
          const getPerfil = u => u.user_metadata?.perfil || u.raw_user_meta_data?.perfil || null;
          const getNome   = u => u.user_metadata?.nome   || u.raw_user_meta_data?.nome   || u.email;
          recentes = users
            .filter(u => getPerfil(u) !== 'admin')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(u => ({ ...u, _nome: getNome(u), _perfil: getPerfil(u) }))
            .slice(0, 6);
        } catch (e) {
          console.error('Erro ao buscar usuários:', e.message);
        }
      }

      setStats({
        alunos:      alunosCount.count      || 0,
        professores: professoresCount.count || 0,
        turmas:      turmasData.length,
        avisos:      avisosData.length,
      });
      setUsuariosRecentes(recentes);

    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" />
      <span style={{ color:'var(--gray-500)' }}>Carregando dashboard...</span>
    </div>
  );

  const statCards = [
    {
      label: 'Alunos cadastrados',
      value: stats.alunos,
      icon: '👨‍🎓',
      cor: '#059669',
      bg: '#d1fae5',
      link: '/alunos',
      desc: 'no sistema',
    },
    {
      label: 'Professores',
      value: stats.professores,
      icon: '👨‍🏫',
      cor: '#0891b2',
      bg: '#cffafe',
      link: '/professores',
      desc: 'no sistema',
    },
    {
      label: 'Turmas ativas',
      value: stats.turmas,
      icon: '🏫',
      cor: '#7c3aed',
      bg: '#ede9fe',
      link: '/turmas',
      desc: 'cadastradas',
    },
    {
      label: 'Avisos publicados',
      value: stats.avisos,
      icon: '📢',
      cor: '#ea580c',
      bg: '#ffedd5',
      link: '/avisos',
      desc: 'no mural',
    },
  ];

  const perfilInfo = perfil => ({
    professor: { icon:'👨‍🏫', cor:'#0891b2', bg:'#cffafe', label:'Professor' },
    aluno:     { icon:'👨‍🎓', cor:'#059669', bg:'#d1fae5', label:'Aluno'     },
    admin:     { icon:'🔑',   cor:'#7c3aed', bg:'#ede9fe', label:'Admin'     },
  }[perfil] || { icon:'👤', cor:'#6b7280', bg:'#f3f4f6', label:'Usuário' });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* ── Cards de stats ── */}
      <div className="stats-grid">
        {statCards.map(s => (
          <Link key={s.label} to={s.link} style={{ textDecoration:'none' }}>
            <div className="stat-card" style={{ cursor:'pointer', transition:'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=''; }}
            >
              <div style={{ width:52, height:52, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                {s.icon}
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color:s.cor }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>{s.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Linha 2: Últimos usuários + Turmas ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

        {/* Últimos usuários cadastrados */}
        <div className="card">
          <div className="card-header">
            <h2>Últimos usuários cadastrados</h2>
            <Link to="/usuarios" style={{ fontSize:13, color:'var(--teal-dark)', fontWeight:600 }}>Ver todos →</Link>
          </div>
          {usuariosRecentes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>Nenhum usuário cadastrado</h3>
              <p>Acesse Usuários para adicionar professores e alunos.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Perfil</th></tr>
              </thead>
              <tbody>
                {usuariosRecentes.map(u => {
                  const info = perfilInfo(u._perfil || u.user_metadata?.perfil || u.raw_user_meta_data?.perfil);
                  const nome = u._nome || u.user_metadata?.nome || u.raw_user_meta_data?.nome || u.email;
                  const ini  = nome.charAt(0).toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:info.bg, color:info.cor, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                            {ini}
                          </div>
                          <span style={{ fontWeight:500, fontSize:14 }}>{nome}</span>
                        </div>
                      </td>
                      <td style={{ color:'var(--gray-500)', fontSize:13 }}>{u.email}</td>
                      <td>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:99, background:info.bg, color:info.cor, fontSize:11, fontWeight:600 }}>
                          {info.icon} {info.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Turmas */}
        <div className="card">
          <div className="card-header">
            <h2>Turmas ativas</h2>
            <Link to="/turmas" style={{ fontSize:13, color:'var(--teal-dark)', fontWeight:600 }}>Gerenciar →</Link>
          </div>
          {turmas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏫</div>
              <h3>Nenhuma turma cadastrada</h3>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Turma</th><th>Série</th><th>Ano</th><th>Professor</th></tr>
              </thead>
              <tbody>
                {turmas.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight:600, fontSize:14 }}>{t.nome}</td>
                    <td style={{ color:'var(--gray-600)', fontSize:13 }}>{t.serie}</td>
                    <td style={{ color:'var(--gray-600)', fontSize:13 }}>{t.ano}</td>
                    <td style={{ color:'var(--gray-500)', fontSize:13 }}>{t.professores?.nome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Avisos ── */}
      <div className="card">
        <div className="card-header">
          <h2>Avisos recentes</h2>
          <Link to="/avisos" style={{ fontSize:13, color:'var(--teal-dark)', fontWeight:600 }}>Ver todos →</Link>
        </div>
        <div className="card-body">
          <AvisosWidget avisos={avisos} />
        </div>
      </div>

    </div>
  );
}

// ── Dashboard do Professor ────────────────────────────────────
function DashboardProfessor() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ turmas:0, alunos:0, avisos:0 });
  const [avisos, setAvisos]   = useState([]);
  const [turmas, setTurmas]   = useState([]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const [turmasData, avisosData, alunosData] = await Promise.all([
          turmasService.listar(),
          avisosService.listarTodos(),
          supabase.from('alunos').select('id', { count:'exact' }),
        ]);
        setStats({ turmas: turmasData.length, alunos: alunosData.count || 0, avisos: avisosData.length });
        setAvisos(avisosData.slice(0, 4));
        setTurmas(turmasData.slice(0, 5));
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    carregar();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div className="stats-grid">
        {[
          { label:'Turmas',  value:stats.turmas, icon:'🏫', cor:'#7c3aed', bg:'#ede9fe' },
          { label:'Alunos',  value:stats.alunos, icon:'👨‍🎓', cor:'#059669', bg:'#d1fae5' },
          { label:'Avisos',  value:stats.avisos, icon:'📢', cor:'#ea580c', bg:'#ffedd5' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ width:52, height:52, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color:s.cor }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><h2>Avisos recentes</h2><Link to="/avisos" style={{ fontSize:13, color:'var(--teal-dark)', fontWeight:600 }}>Ver todos →</Link></div>
        <div className="card-body"><AvisosWidget avisos={avisos} /></div>
      </div>
    </div>
  );
}

// ── Dashboard do Aluno ────────────────────────────────────────
function DashboardAluno() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [avisos, setAvisos]   = useState([]);
  const [notas, setNotas]     = useState([]);
  const [freq, setFreq]       = useState({ total:0, presencas:0, pct:null });

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const [alunosData, notasData, freqData, avisosData] = await Promise.all([
          supabase.from('alunos').select('id,email'),
          supabase.from('notas').select('*'),
          supabase.from('frequencia').select('*'),
          avisosService.listarTodos(),
        ]);
        const eu = alunosData.data?.find(a => a.email === user?.email);
        setAvisos(avisosData.slice(0, 4));
        if (eu) {
          const minhasNotas = notasData.data?.filter(n => n.aluno_id === eu.id) || [];
          const minhaFreq   = freqData.data?.filter(f => f.aluno_id === eu.id)  || [];
          setNotas(minhasNotas);
          const presencas = minhaFreq.filter(f => f.status === 'presente').length;
          setFreq({ total: minhaFreq.length, presencas, pct: minhaFreq.length ? Math.round(presencas / minhaFreq.length * 100) : null });
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    carregar();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  const media = notas.length ? (notas.reduce((s, n) => s + parseFloat(n.nota), 0) / notas.length).toFixed(1) : null;
  const corFreq = freq.pct >= 75 ? '#059669' : freq.pct >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div className="stats-grid">
        {[
          { label:'Disciplinas com nota', value: [...new Set(notas.map(n => n.disciplina))].length || '—', icon:'📝', cor:'#0891b2', bg:'#cffafe' },
          { label:'Média geral',          value: media || '—', icon:'⭐', cor:'#059669', bg:'#d1fae5' },
          { label:'Frequência',           value: freq.pct != null ? `${freq.pct}%` : '—', icon:'📅', cor: freq.pct != null ? corFreq : '#6b7280', bg:'#f3f4f6' },
          { label:'Faltas',               value: freq.total ? freq.total - freq.presencas : '—', icon:'✗', cor:'#f43f5e', bg:'#ffe4e9' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ width:52, height:52, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color:s.cor }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><h2>Avisos da escola</h2><Link to="/avisos" style={{ fontSize:13, color:'var(--teal-dark)', fontWeight:600 }}>Ver todos →</Link></div>
        <div className="card-body"><AvisosWidget avisos={avisos} /></div>
      </div>
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────
export default function Dashboard() {
  const { perfil } = useAuth();
  if (perfil === 'admin')     return <DashboardAdmin />;
  if (perfil === 'professor') return <DashboardProfessor />;
  return <DashboardAluno />;
}
