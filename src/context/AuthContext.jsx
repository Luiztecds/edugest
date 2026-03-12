import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    authService.getSession().then(session => {
      if (session?.user) {
        setUser(session.user);
        setPerfil(session.user.user_metadata?.perfil || 'aluno');
      }
      setLoading(false);
    });

    const { data: listener } = authService.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setPerfil(session.user.user_metadata?.perfil || 'aluno');
      } else {
        setUser(null);
        setPerfil(null);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const data = await authService.signIn(email, password);
    return data;
  };

  const cadastrar = async (email, password, userData) => {
    const data = await authService.signUp(email, password, userData);
    return data;
  };

  const logout = async () => {
    await authService.signOut();
  };

  const atualizarPerfil = (updatedUser) => {
    setUser(updatedUser);
    setPerfil(updatedUser.user_metadata?.perfil || 'aluno');
  };

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, cadastrar, logout, atualizarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
