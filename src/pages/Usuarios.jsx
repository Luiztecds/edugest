import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../services/supabase';

const PERFIS = [
  { value: 'admin',     label: 'Administrador', icon: '🔑', cor: '#7c3aed' },
  { value: 'professor', label: 'Professor',      icon: '👨‍🏫', cor: '#0891b2' },
  { value: 'aluno',     label: 'Aluno',          icon: '👨‍🎓', cor: '#059669' },
];
const perfilInfo = v => PERFIS.find(p => p.value === v) || PERFIS[2];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [modalDel, setModalDel] = useState(null); // usuario a deletar
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState('');
  const [sucesso, setSucesso]   = useState('');
  const [busca, setBusca]       = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('todos');
  const [form, setForm] = useState({ nome: '', email: '', password: '', perfil: 'aluno' });

  const flash = msg => { setSucesso(msg); setTimeout(() => setSucesso(''), 4000); };

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      // Ordenar: admins primeiro, depois professores, depois alunos
      const ordem = { admin: 0, professor: 1, aluno: 2 };
      const sorted = (data.users || []).sort((a, b) => {
        const pa = ordem[a.user_metadata?.perfil || a.raw_user_meta_data?.perfil] ?? 2;
        const pb = ordem[b.user_metadata?.perfil || b.raw_user_meta_data?.perfil] ?? 2;
        return pa - pb;
      });
      setUsuarios(sorted);
    } catch (e) {
      setErro('Erro ao carregar usuários: ' + e.message);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrirModal = () => {
    setForm({ nome: '', email: '', password: '', perfil: 'aluno' });
    setErro('');
    setModal(true);
  };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const criarUsuario = async () => {
    setErro('');
    if (!form.nome.trim())     { setErro('Informe o nome completo.'); return; }
    if (!form.email.trim())    { setErro('Informe o e-mail.'); return; }
    if (!form.password.trim()) { setErro('Informe uma senha.'); return; }
    if (form.password.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }

    setSalvando(true);
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email:         form.email.trim(),
        password:      form.password,
        email_confirm: true,
        user_metadata: { nome: form.nome.trim(), perfil: form.perfil },
      });
      if (error) throw error;
      setModal(false);
      flash(`✅ Usuário "${form.nome}" criado com sucesso!`);
      carregar();
    } catch (e) {
      const msgs = {
        'User already registered':                          'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters':         'A senha precisa ter pelo menos 6 caracteres.',
        'Unable to validate email address: invalid format': 'E-mail inválido.',
      };
      setErro(msgs[e.message] || e.message);
    } finally {
      setSalvando(false);
    }
  };

  const deletarUsuario = async (u) => {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (error) throw error;
      setModalDel(null);
      flash(`🗑️ Usuário "${u.user_metadata?.nome || u.raw_user_meta_data?.nome || u.email}" removido.`);
      carregar();
    } catch (e) {
      setErro('Erro ao remover: ' + e.message);
      setModalDel(null);
    }
  };

  const filtrados = usuarios.filter(u => {
    const nome  = (u.user_metadata?.nome  || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const q     = busca.toLowerCase();
    const matchBusca  = !q || nome.includes(q) || email.includes(q);
    const matchPerfil = filtroPerfil === 'todos' || getPerfil(u) === filtroPerfil;
    return matchBusca && matchPerfil;
  });

  const getPerfil = u => u.user_metadata?.perfil || u.raw_user_meta_data?.perfil || 'aluno';
  const getNome   = u => u.user_metadata?.nome   || u.raw_user_meta_data?.nome   || u.email;
  const contagem  = perfil => usuarios.filter(u => getPerfil(u) === perfil).length;

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--gray-800)', marginBottom:4 }}>Usuários do sistema</h2>
          <p style={{ fontSize:13, color:'var(--gray-500)' }}>{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={abrirModal}>+ Novo usuário</button>
      </div>

      {/* Feedback */}
      {sucesso && <div className="alert alert-success" style={{ marginBottom:20 }}>{sucesso}</div>}
      {erro && !modal && <div className="alert alert-error" style={{ marginBottom:20 }}>⚠ {erro}</div>}

      {/* Cards resumo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        {PERFIS.map(p => (
          <div
            key={p.value}
            onClick={() => setFiltroPerfil(prev => prev === p.value ? 'todos' : p.value)}
            style={{
              background: filtroPerfil === p.value ? `${p.cor}12` : '#fff',
              border: `1.5px solid ${filtroPerfil === p.value ? p.cor : 'var(--gray-200)'}`,
              borderRadius:12, padding:'18px 20px',
              display:'flex', alignItems:'center', gap:14,
              cursor:'pointer', transition:'all 0.18s',
            }}
          >
            <div style={{ width:46, height:46, borderRadius:10, background:`${p.cor}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
              {p.icon}
            </div>
            <div>
              <div style={{ fontSize:28, fontWeight:800, color:p.cor, lineHeight:1 }}>{contagem(p.value)}</div>
              <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>{p.label}{contagem(p.value) !== 1 ? 'es' : ''}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div style={{ marginBottom:20 }}>
        <input
          className="form-input"
          placeholder="🔍 Buscar por nome ou e-mail..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ maxWidth:360 }}
        />
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--gray-400)', fontSize:14 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Carregando...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--gray-400)', fontSize:14 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
            {busca || filtroPerfil !== 'todos' ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado ainda.'}
            {!busca && filtroPerfil === 'todos' && (
              <div style={{ marginTop:12 }}>
                <button className="btn btn-primary btn-sm" onClick={abrirModal}>Criar primeiro usuário</button>
              </div>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Cadastrado em</th>
                <th style={{ width:60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => {
                const info = perfilInfo(getPerfil(u));
                const nome = getNome(u) || '—';
                const dt   = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—';
                const ini  = nome.charAt(0).toUpperCase();
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:36, height:36, borderRadius:8,
                          background:`${info.cor}18`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:15, fontWeight:700, color:info.cor, flexShrink:0,
                        }}>
                          {ini}
                        </div>
                        <span style={{ fontWeight:600, color:'var(--gray-800)', fontSize:14 }}>{nome}</span>
                      </div>
                    </td>
                    <td style={{ color:'var(--gray-600)', fontSize:13 }}>{u.email}</td>
                    <td>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:5,
                        padding:'3px 10px', borderRadius:99,
                        background:`${info.cor}15`, color:info.cor,
                        fontSize:12, fontWeight:600,
                      }}>
                        {info.icon} {info.label}
                      </span>
                    </td>
                    <td style={{ color:'var(--gray-500)', fontSize:13 }}>{dt}</td>
                    <td>
                      <button
                        onClick={() => setModalDel(u)}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--gray-400)', padding:'4px 8px', borderRadius:6, transition:'color 0.15s' }}
                        title="Remover usuário"
                        onMouseEnter={e => e.target.style.color='#ef4444'}
                        onMouseLeave={e => e.target.style.color='var(--gray-400)'}
                      >🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal criar usuário ── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'32px 36px', width:'100%', maxWidth:440, boxShadow:'0 24px 64px rgba(0,0,0,0.2)', animation:'modalIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>

            <h3 style={{ fontSize:20, fontWeight:700, color:'var(--gray-800)', marginBottom:4 }}>Novo usuário</h3>
            <p style={{ fontSize:13, color:'var(--gray-500)', marginBottom:24 }}>O acesso é liberado imediatamente após o cadastro.</p>

            {erro && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠ {erro}</div>}

            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input className="form-input" name="nome" value={form.nome} onChange={handleChange} placeholder="Nome da pessoa" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@escola.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Senha inicial</label>
              <input className="form-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="form-group">
              <label className="form-label">Perfil de acesso</label>
              <select className="form-select" name="perfil" value={form.perfil} onChange={handleChange}>
                {PERFIS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
              </select>
            </div>

            {/* Descrição do perfil */}
            <div style={{ padding:'11px 14px', borderRadius:10, marginBottom:20, background:`${perfilInfo(form.perfil).cor}10`, border:`1px solid ${perfilInfo(form.perfil).cor}25`, fontSize:13, color:perfilInfo(form.perfil).cor }}>
              {form.perfil === 'admin'     && '🔑 Acesso total: alunos, professores, turmas, usuários e configurações.'}
              {form.perfil === 'professor' && '👨‍🏫 Acesso a notas, frequência, turmas, calendário e avisos.'}
              {form.perfil === 'aluno'     && '👨‍🎓 Acesso somente às próprias notas, frequência e avisos gerais.'}
            </div>

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-secondary" onClick={() => { setModal(false); setErro(''); }} style={{ flex:1 }} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary"   onClick={criarUsuario} style={{ flex:1 }} disabled={salvando}>
                {salvando ? '⏳ Criando...' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar exclusão ── */}
      {modalDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'32px 36px', width:'100%', maxWidth:400, boxShadow:'0 24px 64px rgba(0,0,0,0.2)', animation:'modalIn 0.25s cubic-bezier(0.16,1,0.3,1)', textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
            <h3 style={{ fontSize:18, fontWeight:700, color:'var(--gray-800)', marginBottom:8 }}>Remover usuário?</h3>
            <p style={{ fontSize:14, color:'var(--gray-500)', marginBottom:24, lineHeight:1.6 }}>
              O usuário <strong>{modalDel.user_metadata?.nome || modalDel.raw_user_meta_data?.nome || modalDel.email}</strong> perderá acesso imediatamente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-secondary" onClick={() => setModalDel(null)} style={{ flex:1 }}>Cancelar</button>
              <button
                onClick={() => deletarUsuario(modalDel)}
                style={{ flex:1, padding:'10px', background:'#ef4444', border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer' }}
              >
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.96) translateY(8px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
