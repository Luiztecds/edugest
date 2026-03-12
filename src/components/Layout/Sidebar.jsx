import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: '📊', label: 'Dashboard',   section: 'Principal', perfis: ['admin', 'professor', 'aluno'] },
  { to: '/alunos',      icon: '👨‍🎓', label: 'Alunos',      section: 'Gestão',    perfis: ['admin'] },
  { to: '/professores', icon: '👨‍🏫', label: 'Professores', section: 'Gestão',    perfis: ['admin'] },
  { to: '/turmas',      icon: '🏫', label: 'Turmas',      section: 'Gestão',    perfis: ['admin', 'professor'] },
  { to: '/importar',    icon: '📥', label: 'Importar',    section: 'Gestão',    perfis: ['admin'] },
  { to: '/notas',       icon: '📝', label: 'Notas',        section: 'Acadêmico', perfis: ['admin', 'professor', 'aluno'] },
  { to: '/frequencia',  icon: '📅', label: 'Frequência',  section: 'Acadêmico', perfis: ['admin', 'professor', 'aluno'] },
  { to: '/calendario',  icon: '🗓️', label: 'Calendário',  section: 'Acadêmico', perfis: ['admin', 'professor', 'aluno'] },
  { to: '/avisos',      icon: '📢', label: 'Avisos',      section: 'Acadêmico', perfis: ['admin', 'professor', 'aluno'] },
];

const PERFIL_LABELS  = { admin: 'Administrador', professor: 'Professor', aluno: 'Aluno' };
const PERFIL_CORES   = { admin: 'var(--teal)', professor: 'var(--amber)', aluno: 'var(--blue)' };
const PERFIL_HEX     = { admin: '#00c9b1', professor: '#f59e0b', aluno: '#3b82f6' };

export default function Sidebar() {
  const { user, perfil, logout } = useAuth();

  const nome      = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário';
  const inicial   = nome[0]?.toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const cor       = PERFIL_HEX[perfil] || '#00c9b1';

  const itemsVisiveis = NAV_ITEMS.filter(n => n.perfis.includes(perfil));
  const sections      = [...new Set(itemsVisiveis.map(n => n.section))];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">🎓</div>
          <div className="logo-text">
            <h2>EduGest</h2>
            <span>Gestão Escolar</span>
          </div>
        </div>
      </div>

      <NavLink to="/perfil" style={{ textDecoration: 'none' }}>
        <div
          className="sidebar-user"
          style={{ cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            border: `2.5px solid ${cor}`, overflow: 'hidden',
            background: cor + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: cor,
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
              : inicial
            }
          </div>
          <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
            <div className="name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</div>
            <div className="role" style={{ color: PERFIL_CORES[perfil] }}>{PERFIL_LABELS[perfil] || perfil}</div>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>✏️</span>
        </div>
      </NavLink>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {itemsVisiveis.filter(n => n.section === section).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/perfil"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          style={{ marginBottom: 8, fontSize: 13 }}
        >
          <span className="nav-icon">👤</span>
          Meu Perfil
        </NavLink>
        <button className="btn-logout" onClick={logout}>
          <span>🚪</span>
          Sair
        </button>
      </div>
    </aside>
  );
}
