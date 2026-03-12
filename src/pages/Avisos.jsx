import { useEffect, useState } from 'react';
import { avisosService } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const TIPOS = [
  { value: 'geral',    label: 'Geral',    cor: '#3b82f6', bg: '#dbeafe', icon: '📢' },
  { value: 'urgente',  label: 'Urgente',  cor: '#f43f5e', bg: '#ffe4e9', icon: '🚨' },
  { value: 'evento',   label: 'Evento',   cor: '#8b5cf6', bg: '#ede9fe', icon: '🎉' },
  { value: 'feriado',  label: 'Feriado',  cor: '#f59e0b', bg: '#fef3c7', icon: '🗓️' },
];

const PUBLICOS = [
  { value: 'todos',       label: 'Todos' },
  { value: 'alunos',      label: 'Somente Alunos' },
  { value: 'professores', label: 'Somente Professores' },
];

const FORM_INICIAL = {
  titulo: '', conteudo: '', tipo: 'geral',
  publico_alvo: 'todos', data_expiracao: '', fixado: false
};

function tipoInfo(tipo) {
  return TIPOS.find(t => t.value === tipo) || TIPOS[0];
}

function diasRestantes(dataExpiracao) {
  if (!dataExpiracao) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const exp = new Date(dataExpiracao + 'T00:00:00');
  const diff = Math.round((exp - hoje) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Avisos() {
  const { perfil, user } = useAuth();
  const isAdmin     = perfil === 'admin';
  const isProfessor = perfil === 'professor';
  const isAluno     = perfil === 'aluno';
  const podeEditar  = isAdmin || isProfessor;

  const [avisos, setAvisos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editando, setEditando]     = useState(null);
  const [form, setForm]             = useState(FORM_INICIAL);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busca, setBusca]           = useState('');
  const [mostrarExpirados, setMostrarExpirados] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = isAdmin
        ? await avisosService.listarTodos()
        : await avisosService.listar();
      setAvisos(data);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirModal = (aviso = null) => {
    setEditando(aviso);
    setForm(aviso ? {
      titulo:         aviso.titulo,
      conteudo:       aviso.conteudo,
      tipo:           aviso.tipo,
      publico_alvo:   aviso.publico_alvo,
      data_expiracao: aviso.data_expiracao || '',
      fixado:         aviso.fixado || false,
    } : FORM_INICIAL);
    setErro('');
    setModalOpen(true);
  };

  const fecharModal = () => { setModalOpen(false); setEditando(null); };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const salvar = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      setErro('Título e conteúdo são obrigatórios.'); return;
    }
    setSalvando(true); setErro('');
    try {
      const payload = {
        ...form,
        data_expiracao: form.data_expiracao || null,
        autor_id: user?.id,
        autor_nome: user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Sistema',
      };
      if (editando) await avisosService.atualizar(editando.id, payload);
      else await avisosService.criar(payload);
      await carregar();
      fecharModal();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este aviso?')) return;
    try { await avisosService.excluir(id); setAvisos(a => a.filter(x => x.id !== id)); }
    catch (e) { alert(e.message); }
  };

  const hoje = new Date().toISOString().split('T')[0];

  const avisosFiltrados = avisos.filter(a => {
    const expirado = a.data_expiracao && a.data_expiracao < hoje;
    if (expirado && !mostrarExpirados) return false;
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    if (busca && !a.titulo.toLowerCase().includes(busca.toLowerCase()) &&
        !a.conteudo.toLowerCase().includes(busca.toLowerCase())) return false;
    // Aluno não vê avisos só para professores
    if (isAluno && a.publico_alvo === 'professores') return false;
    // Professor não vê avisos só para alunos... mas vê tudo para não perder contexto
    return true;
  });

  // Fixados primeiro, depois por data
  const avisosOrdenados = [
    ...avisosFiltrados.filter(a => a.fixado),
    ...avisosFiltrados.filter(a => !a.fixado),
  ];

  const totalUrgentes = avisos.filter(a => a.tipo === 'urgente' && (!a.data_expiracao || a.data_expiracao >= hoje)).length;
  const totalAtivos   = avisos.filter(a => !a.data_expiracao || a.data_expiracao >= hoje).length;

  return (
    <>
      {/* Header com stats e ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{
            padding: '12px 20px', background: 'white', borderRadius: 'var(--radius)',
            border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ width: 40, height: 40, background: 'var(--blue-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📢</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)', lineHeight: 1 }}>{totalAtivos}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Avisos ativos</div>
            </div>
          </div>
          {totalUrgentes > 0 && (
            <div style={{
              padding: '12px 20px', background: '#ffe4e9', borderRadius: 'var(--radius)',
              border: '1px solid #fda4af', display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{ fontSize: 24 }}>🚨</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f43f5e', lineHeight: 1 }}>{totalUrgentes}</div>
                <div style={{ fontSize: 12, color: '#be123c', marginTop: 2 }}>Urgentes</div>
              </div>
            </div>
          )}
        </div>

        {podeEditar && (
          <button className="btn btn-primary" onClick={() => abrirModal()}>
            + Novo Aviso
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <span>🔍</span>
          <input placeholder="Buscar aviso..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`tab-btn ${!filtroTipo ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => setFiltroTipo('')}
          >
            Todos
          </button>
          {TIPOS.map(t => (
            <button
              key={t.value}
              onClick={() => setFiltroTipo(filtroTipo === t.value ? '' : t.value)}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: filtroTipo === t.value ? t.cor : t.bg,
                color: filtroTipo === t.value ? 'white' : t.cor,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-500)', cursor: 'pointer', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={mostrarExpirados}
              onChange={e => setMostrarExpirados(e.target.checked)}
              style={{ accentColor: 'var(--teal)', width: 14, height: 14 }}
            />
            Mostrar expirados
          </label>
        )}
      </div>

      {/* Lista de avisos */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : avisosOrdenados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📢</div>
          <h3>Nenhum aviso encontrado</h3>
          <p>{podeEditar ? 'Clique em "Novo Aviso" para publicar o primeiro.' : 'Nenhum aviso publicado no momento.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {avisosOrdenados.map(aviso => {
            const tipo       = tipoInfo(aviso.tipo);
            const expirado   = aviso.data_expiracao && aviso.data_expiracao < hoje;
            const dias       = diasRestantes(aviso.data_expiracao);
            const podeExcluir = isAdmin || (isProfessor && aviso.autor_id === user?.id);
            const podeEditar2 = isAdmin || (isProfessor && aviso.autor_id === user?.id);

            return (
              <div
                key={aviso.id}
                className="card"
                style={{
                  opacity: expirado ? 0.55 : 1,
                  borderLeft: `4px solid ${tipo.cor}`,
                  transition: 'box-shadow 0.2s',
                  position: 'relative'
                }}
              >
                {/* Badge fixado */}
                {aviso.fixado && (
                  <div style={{
                    position: 'absolute', top: 12, right: podeEditar2 ? 100 : 16,
                    fontSize: 11, fontWeight: 700, color: '#92400e',
                    background: '#fef3c7', padding: '2px 8px', borderRadius: 99,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    📌 Fixado
                  </div>
                )}

                <div className="card-body" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Tipo + público */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: tipo.bg, color: tipo.cor
                        }}>
                          {tipo.icon} {tipo.label}
                        </span>
                        {aviso.publico_alvo !== 'todos' && (
                          <span style={{
                            padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                            background: 'var(--gray-100)', color: 'var(--gray-500)'
                          }}>
                            👥 {PUBLICOS.find(p => p.value === aviso.publico_alvo)?.label}
                          </span>
                        )}
                        {expirado && (
                          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--gray-100)', color: 'var(--gray-400)' }}>
                            ⏰ Expirado
                          </span>
                        )}
                      </div>

                      {/* Título */}
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
                        {aviso.titulo}
                      </h3>

                      {/* Conteúdo */}
                      <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {aviso.conteudo}
                      </p>

                      {/* Rodapé */}
                      <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--gray-400)', flexWrap: 'wrap' }}>
                        <span>✍️ {aviso.autor_nome || 'Sistema'}</span>
                        <span>🕐 {new Date(aviso.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {aviso.data_expiracao && !expirado && dias !== null && (
                          <span style={{ color: dias <= 3 ? '#f59e0b' : 'var(--gray-400)', fontWeight: dias <= 3 ? 700 : 400 }}>
                            ⏳ {dias === 0 ? 'Expira hoje' : dias === 1 ? 'Expira amanhã' : `Expira em ${dias} dias`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    {podeEditar2 && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginTop: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => abrirModal(aviso)}>✏️</button>
                        {podeExcluir && (
                          <button className="btn btn-danger btn-sm" onClick={() => excluir(aviso.id)}>🗑️</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && podeEditar && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>{editando ? 'Editar Aviso' : 'Novo Aviso'}</h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Título *</label>
                  <input
                    className="form-input" name="titulo" value={form.titulo}
                    onChange={handleChange} placeholder="Ex: Reunião de pais — 15 de abril"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" name="tipo" value={form.tipo} onChange={handleChange}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Público-alvo</label>
                  <select className="form-select" name="publico_alvo" value={form.publico_alvo} onChange={handleChange}>
                    {PUBLICOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                <div className="form-group full">
                  <label className="form-label">Conteúdo *</label>
                  <textarea
                    className="form-textarea" name="conteudo" value={form.conteudo}
                    onChange={handleChange} rows={5}
                    placeholder="Digite o texto completo do aviso..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data de expiração</label>
                  <input
                    className="form-input" type="date" name="data_expiracao"
                    value={form.data_expiracao} onChange={handleChange}
                  />
                  <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>
                    Deixe vazio para não expirar
                  </span>
                </div>

                <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 24 }}>
                    <input
                      type="checkbox" name="fixado" checked={form.fixado}
                      onChange={handleChange}
                      style={{ accentColor: 'var(--teal)', width: 16, height: 16 }}
                    />
                    <span className="form-label" style={{ marginBottom: 0 }}>📌 Fixar no topo</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {form.titulo && (
                <div style={{
                  marginTop: 16, padding: '14px 16px', borderRadius: 8,
                  borderLeft: `3px solid ${tipoInfo(form.tipo).cor}`,
                  background: tipoInfo(form.tipo).bg + '88'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tipoInfo(form.tipo).cor, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {tipoInfo(form.tipo).icon} Prévia
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{form.titulo}</div>
                  {form.conteudo && <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>{form.conteudo.slice(0, 120)}{form.conteudo.length > 120 ? '...' : ''}</div>}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {editando && isAdmin && (
                <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { excluir(editando.id); fecharModal(); }}>
                  🗑️ Excluir
                </button>
              )}
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Publicando...' : editando ? '✓ Salvar' : '📢 Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
