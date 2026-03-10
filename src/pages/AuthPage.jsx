import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [modo, setModo] = useState('login');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const { login, cadastrar } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
    nome: '',
    perfil: 'aluno'
  });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setErro('');
    if (!form.email || !form.password) { setErro('Preencha email e senha.'); return; }
    setLoading(true);
    try {
      if (modo === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.nome) { setErro('Informe seu nome.'); setLoading(false); return; }
        await cadastrar(form.email, form.password, { nome: form.nome, perfil: form.perfil });
        setErro('');
        alert('Cadastro realizado! Verifique seu email para confirmar.');
        setModo('login');
      }
    } catch (e) {
      const msgs = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'User already registered': 'Este email já está cadastrado.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.'
      };
      setErro(msgs[e.message] || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">🎓</div>
          <h1>EduGest</h1>
          <p>Sistema completo de gestão escolar para modernizar sua instituição de ensino.</p>
          <div className="auth-features">
            {['Gestão de alunos e professores', 'Controle de notas e frequência', 'Turmas e disciplinas', 'Relatórios e dashboard'].map(f => (
              <div className="auth-feature" key={f}>
                <div className="auth-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h2>{modo === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}</h2>
          <p className="subtitle">
            {modo === 'login'
              ? 'Entre com suas credenciais para acessar o sistema.'
              : 'Crie sua conta para começar a usar o EduGest.'}
          </p>

          {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}

          <div className="auth-form">
            {modo === 'cadastro' && (
              <>
                <div className="form-group">
                  <label className="form-label">Nome completo</label>
                  <input className="form-input" name="nome" value={form.nome} onChange={handleChange} placeholder="Seu nome" />
                </div>
                <div className="form-group">
                  <label className="form-label">Perfil</label>
                  <select className="form-select" name="perfil" value={form.perfil} onChange={handleChange}>
                    <option value="admin">Administrador</option>
                    <option value="professor">Professor</option>
                    <option value="aluno">Aluno</option>
                  </select>
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Aguarde...' : modo === 'login' ? '→ Entrar' : '✓ Criar conta'}
            </button>
          </div>

          <div className="auth-switch">
            {modo === 'login' ? (
              <>Não tem conta? <button onClick={() => { setModo('cadastro'); setErro(''); }}>Cadastre-se</button></>
            ) : (
              <>Já tem conta? <button onClick={() => { setModo('login'); setErro(''); }}>Entrar</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
