import { useEffect, useState } from 'react';
import { dashboardService, alunosService } from '../services/supabase';

const AVISOS = [
  { id: 1, titulo: 'Reunião de pais', texto: 'Reunião de pais e mestres na sexta-feira às 19h.', data: '10/03/2025', tipo: 'info' },
  { id: 2, titulo: 'Feriado', texto: 'Não haverá aulas no dia 21 de março (Tiradentes).', data: '08/03/2025', tipo: 'amber' },
  { id: 3, titulo: 'Resultado das provas', texto: 'Notas do 1º bimestre disponíveis no sistema.', data: '05/03/2025', tipo: 'green' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ totalAlunos: 0, totalProfessores: 0, totalTurmas: 0 });
  const [recentAlunos, setRecentAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardService.estatisticas(), alunosService.listar()])
      .then(([s, alunos]) => {
        setStats(s);
        setRecentAlunos(alunos.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" />
      <span style={{ color: 'var(--gray-500)' }}>Carregando dashboard...</span>
    </div>
  );

  return (
    <div>
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
          <div className="stat-icon green">📊</div>
          <div className="stat-info">
            <div className="stat-value">1º</div>
            <div className="stat-label">Bimestre Atual</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h2>Alunos Recentes</h2>
            <span className="badge badge-teal">{stats.totalAlunos} total</span>
          </div>
          <div>
            {recentAlunos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🎓</div>
                <h3>Nenhum aluno cadastrado</h3>
                <p>Adicione alunos para visualizá-los aqui</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Turma</th>
                    <th>Email</th>
                  </tr>
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
                          }}>
                            {a.nome?.[0]?.toUpperCase()}
                          </div>
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
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Avisos</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {AVISOS.map(a => (
              <div key={a.id} style={{
                padding: '14px',
                background: a.tipo === 'info' ? 'var(--blue-light)' : a.tipo === 'amber' ? 'var(--amber-light)' : 'var(--green-light)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${a.tipo === 'info' ? 'var(--blue)' : a.tipo === 'amber' ? 'var(--amber)' : 'var(--green)'}`
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--gray-800)' }}>{a.titulo}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 6 }}>{a.texto}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{a.data}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
