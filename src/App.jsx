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
import './styles/global.css';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/alunos': 'Gestão de Alunos',
  '/professores': 'Gestão de Professores',
  '/turmas': 'Gestão de Turmas',
  '/notas': 'Notas e Avaliações',
  '/frequencia': 'Controle de Frequência',
};

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/professores" element={<Professores />} />
            <Route path="/turmas" element={<Turmas />} />
            <Route path="/notas" element={<Notas />} />
            <Route path="/frequencia" element={<Frequencia />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
          <Route path="/*" element={<PrivateLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
