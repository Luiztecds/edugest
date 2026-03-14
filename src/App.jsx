import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import Professores from './pages/Professores';
import Turmas from './pages/Turmas';
import Notas from './pages/Notas';
import Frequencia from './pages/Frequencia';
import Calendario from './pages/Calendario';
import Avisos from './pages/Avisos';
import Perfil from './pages/Perfil';
import Importar from './pages/Importar';
import Usuarios from './pages/Usuarios';
import './styles/global.css';

const PAGE_TITLES = {
  '/dashboard':   'Dashboard',
  '/alunos':      'Gestão de Alunos',
  '/professores': 'Gestão de Professores',
  '/turmas':      'Gestão de Turmas',
  '/notas':       'Notas e Avaliações',
  '/frequencia':  'Controle de Frequência',
  '/calendario':  'Calendário Escolar',
  '/avisos':      'Mural de Avisos',
  '/perfil':      'Meu Perfil',
  '/importar':    'Importar Planilha',
  '/usuarios':    'Gerenciar Usuários',
};

const ROTA_PERFIS = {
  '/dashboard':   ['admin', 'professor', 'aluno'],
  '/alunos':      ['admin'],
  '/professores': ['admin'],
  '/turmas':      ['admin', 'professor'],
  '/notas':       ['admin', 'professor', 'aluno'],
  '/frequencia':  ['admin', 'professor', 'aluno'],
  '/calendario':  ['admin', 'professor', 'aluno'],
  '/avisos':      ['admin', 'professor', 'aluno'],
  '/perfil':      ['admin', 'professor', 'aluno'],
  '/importar':    ['admin'],
  '/usuarios':    ['admin'],
};

function RotaProtegida({ element, rota }) {
  const { perfil } = useAuth();
  const permitidos = ROTA_PERFIS[rota] || [];
  if (!permitidos.includes(perfil)) {
    return <Navigate to="/dashboard" replace />;
  }
  return element;
}

function AcessoNegado() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center'
    }}>
      <div style={{ fontSize: 64 }}>🔒</div>
      <h2 style={{ fontSize: 24, color: 'var(--gray-700)' }}>Acesso não permitido</h2>
      <p style={{ color: 'var(--gray-500)' }}>Você não tem permissão para acessar esta página.</p>
      <Navigate to="/dashboard" replace />
    </div>
  );
}

function PrivateLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--navy)', flexDirection: 'column', gap: 16
      }}>
        <div style={{ fontSize: 48 }}>🎓</div>
        <div className="spinner" style={{ borderTopColor: 'var(--teal)' }} />
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Carregando EduGest...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const title = PAGE_TITLES[location.pathname] || 'EduGest';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="page-header">
          <h1>{title}</h1>
          <div className="page-header-actions">
            <div style={{
              padding: '6px 14px', background: 'var(--teal-light)',
              borderRadius: 99, fontSize: 13, fontWeight: 600, color: 'var(--teal-dark)'
            }}>
              🟢 Online
            </div>
          </div>
        </header>
        <main className="page-body">
          <Routes>
            <Route path="/dashboard"   element={<RotaProtegida rota="/dashboard"   element={<Dashboard />} />} />
            <Route path="/alunos"      element={<RotaProtegida rota="/alunos"      element={<Alunos />} />} />
            <Route path="/professores" element={<RotaProtegida rota="/professores" element={<Professores />} />} />
            <Route path="/turmas"      element={<RotaProtegida rota="/turmas"      element={<Turmas />} />} />
            <Route path="/notas"       element={<RotaProtegida rota="/notas"       element={<Notas />} />} />
            <Route path="/frequencia"  element={<RotaProtegida rota="/frequencia"  element={<Frequencia />} />} />
            <Route path="/calendario"  element={<RotaProtegida rota="/calendario"  element={<Calendario />} />} />
            <Route path="/avisos"      element={<RotaProtegida rota="/avisos"      element={<Avisos />} />} />
            <Route path="/perfil"      element={<RotaProtegida rota="/perfil"      element={<Perfil />} />} />
            <Route path="/importar"    element={<RotaProtegida rota="/importar"    element={<Importar />} />} />
            <Route path="/usuarios"    element={<RotaProtegida rota="/usuarios"    element={<Usuarios />} />} />
            <Route path="*"            element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute />} />
          <Route path="/*"     element={<PrivateLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
