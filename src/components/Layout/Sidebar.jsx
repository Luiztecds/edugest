import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard', section: 'Principal' },
  { to: '/alunos', icon: '👨‍🎓', label: 'Alunos', section: 'Gestão' },
  { to: '/professores', icon: '👨‍🏫', label: 'Professores', section: 'Gestão' },
  { to: '/turmas', icon: '🏫', label: 'Turmas', section: 'Gestão' },
  { to: '/notas', icon: '📝', label: 'Notas', section: 'Acadêmico' },
  { to: '/frequencia', icon: '📅', label: 'Frequência', section: 'Acadêmico' },
];

export default function Sidebar() {
  const { user, perfil, logout } = useAuth();

  const sections = [...new Set(NAV_ITEMS.map(n => n.section))];
  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário';
  const inicial = nome[0]?.toUpperCase();
  const perfilLabels = { admin: 'Administrador', professor: 'Professor', aluno: 'Aluno' };

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

      <div className="sidebar-user">
        <div className="user-avatar">{inicial}</div>
        <div className="user-info">
          <div className="name">{nome}</div>
          <div className="role">{perfilLabels[perfil] || perfil}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {NAV_ITEMS.filter(n => n.section === section).map(item => (
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
        <button className="btn-logout" onClick={logout}>
          <span>🚪</span>
          Sair
        </button>
      </div>
    </aside>
  );
}
