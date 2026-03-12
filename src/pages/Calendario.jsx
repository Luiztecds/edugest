import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { calendarioService } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const TIPOS = [
  { value: 'prova',    label: '📝 Prova/Avaliação', cor: '#f43f5e' },
  { value: 'feriado',  label: '🎉 Feriado',          cor: '#f59e0b' },
  { value: 'evento',   label: '🏫 Evento Escolar',   cor: '#3b82f6' },
  { value: 'reuniao',  label: '👥 Reunião',           cor: '#8b5cf6' },
  { value: 'entrega',  label: '📋 Entrega/Prazo',    cor: '#10b981' },
  { value: 'recesso',  label: '😴 Recesso',           cor: '#94a3b8' },
];

const corPorTipo = (tipo) => TIPOS.find(t => t.value === tipo)?.cor || '#3b82f6';

const FORM_INICIAL = {
  titulo: '', tipo: 'evento', data_inicio: '', data_fim: '',
  descricao: '', turma: '', dia_todo: true
};

// Feriados nacionais 2025 pré-carregados
const FERIADOS_2025 = [
  { titulo: 'Ano Novo',             tipo: 'feriado', data_inicio: '2025-01-01', data_fim: '2025-01-01', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Carnaval',             tipo: 'feriado', data_inicio: '2025-03-03', data_fim: '2025-03-04', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Tiradentes',           tipo: 'feriado', data_inicio: '2025-04-21', data_fim: '2025-04-21', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Dia do Trabalho',      tipo: 'feriado', data_inicio: '2025-05-01', data_fim: '2025-05-01', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Corpus Christi',       tipo: 'feriado', data_inicio: '2025-06-19', data_fim: '2025-06-19', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Independência do Brasil', tipo: 'feriado', data_inicio: '2025-09-07', data_fim: '2025-09-07', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Nossa Sra. Aparecida', tipo: 'feriado', data_inicio: '2025-10-12', data_fim: '2025-10-12', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Finados',              tipo: 'feriado', data_inicio: '2025-11-02', data_fim: '2025-11-02', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Proclamação da República', tipo: 'feriado', data_inicio: '2025-11-15', data_fim: '2025-11-15', dia_todo: true, descricao: 'Feriado Nacional' },
  { titulo: 'Natal',                tipo: 'feriado', data_inicio: '2025-12-25', data_fim: '2025-12-25', dia_todo: true, descricao: 'Feriado Nacional' },
];

export default function Calendario() {
  const { perfil } = useAuth();
  const isAdmin     = perfil === 'admin';
  const isProfessor = perfil === 'professor';
  const podeEditar  = isAdmin || isProfessor;

  const calendarRef = useRef(null);
  const [eventos, setEventos]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [detalheEvento, setDetalheEvento] = useState(null);
  const [editando, setEditando]     = useState(null);
  const [form, setForm]             = useState(FORM_INICIAL);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState('');
  const [vista, setVista]           = useState('dayGridMonth');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [importando, setImportando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await calendarioService.listar();
      setEventos(data);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  // Converte eventos do banco para formato FullCalendar
  const eventosCalendar = eventos
    .filter(e => !filtroTipo || e.tipo === filtroTipo)
    .map(e => ({
      id: e.id,
      title: e.titulo,
      start: e.data_inicio,
      end: e.data_fim ? (e.dia_todo ? somarDia(e.data_fim) : e.data_fim) : undefined,
      allDay: e.dia_todo,
      backgroundColor: corPorTipo(e.tipo),
      borderColor: corPorTipo(e.tipo),
      extendedProps: { ...e }
    }));

  function somarDia(dataStr) {
    const d = new Date(dataStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  const abrirModal = (evento = null) => {
    setEditando(evento);
    setForm(evento ? {
      titulo: evento.titulo,
      tipo: evento.tipo,
      data_inicio: evento.data_inicio,
      data_fim: evento.data_fim || evento.data_inicio,
      descricao: evento.descricao || '',
      turma: evento.turma || '',
      dia_todo: evento.dia_todo ?? true
    } : FORM_INICIAL);
    setDetalheEvento(null);
    setErro('');
    setModalOpen(true);
  };

  const fecharModal = () => { setModalOpen(false); setEditando(null); setDetalheEvento(null); };
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const salvar = async () => {
    if (!form.titulo || !form.data_inicio) { setErro('Título e data são obrigatórios.'); return; }
    setSalvando(true); setErro('');
    try {
      const payload = { ...form, data_fim: form.data_fim || form.data_inicio };
      if (editando) await calendarioService.atualizar(editando.id, payload);
      else await calendarioService.criar(payload);
      await carregar(); fecharModal();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este evento?')) return;
    try { await calendarioService.excluir(id); await carregar(); fecharModal(); }
    catch (e) { alert(e.message); }
  };

  const importarFeriados = async () => {
    if (!confirm('Importar todos os feriados nacionais de 2025?')) return;
    setImportando(true);
    try {
      for (const f of FERIADOS_2025) {
        await calendarioService.criar(f);
      }
      await carregar();
    } catch (e) { alert(e.message); }
    finally { setImportando(false); }
  };

  // Click no calendário: abre detalhe ou modal de criar
  const handleDateClick = (info) => {
    if (!podeEditar) return;
    setForm({ ...FORM_INICIAL, data_inicio: info.dateStr, data_fim: info.dateStr });
    setEditando(null); setDetalheEvento(null); setErro('');
    setModalOpen(true);
  };

  const handleEventClick = (info) => {
    setDetalheEvento(info.event.extendedProps);
    setModalOpen(false);
  };

  // Drag & drop para mover evento
  const handleEventDrop = async (info) => {
    if (!podeEditar) { info.revert(); return; }
    const ev = info.event.extendedProps;
    const novaData = info.event.startStr;
    try {
      await calendarioService.atualizar(ev.id, { ...ev, data_inicio: novaData, data_fim: novaData });
      await carregar();
    } catch (e) { info.revert(); }
  };

  const tipoLabel = (tipo) => TIPOS.find(t => t.value === tipo)?.label || tipo;

  // Próximos eventos (5)
  const hoje = new Date().toISOString().split('T')[0];
  const proximosEventos = [...eventos]
    .filter(e => e.data_inicio >= hoje)
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
    .slice(0, 5);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

      {/* ── Calendário principal ── */}
      <div className="card">
        <div className="card-header">
          <h2>Calendário Escolar</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Filtro por tipo */}
            <select
              className="form-select"
              style={{ width: 180, fontSize: 13 }}
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {podeEditar && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={importarFeriados}
                  disabled={importando}
                  title="Importar feriados nacionais 2025"
                >
                  {importando ? '⏳' : '🇧🇷'} Feriados 2025
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => abrirModal()}>
                  + Novo Evento
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          {/* Legenda */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
            {TIPOS.map(t => (
              <div
                key={t.value}
                onClick={() => setFiltroTipo(filtroTipo === t.value ? '' : t.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, cursor: 'pointer', padding: '3px 8px',
                  borderRadius: 99, transition: 'all 0.15s',
                  background: filtroTipo === t.value ? t.cor + '22' : 'transparent',
                  border: `1.5px solid ${filtroTipo === t.value ? t.cor : 'var(--gray-200)'}`,
                  color: filtroTipo === t.value ? t.cor : 'var(--gray-500)',
                  fontWeight: filtroTipo === t.value ? 700 : 400
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.cor, flexShrink: 0 }} />
                {t.label}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
              initialView={vista}
              locale={ptBrLocale}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listMonth'
              }}
              events={eventosCalendar}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              editable={podeEditar}
              droppable={podeEditar}
              selectable={podeEditar}
              height="auto"
              eventDisplay="block"
              dayMaxEvents={3}
              moreLinkContent={(args) => `+${args.num} mais`}
              viewDidMount={(info) => setVista(info.view.type)}
              buttonText={{ today: 'Hoje', month: 'Mês', list: 'Lista' }}
              noEventsContent="Nenhum evento neste período"
            />
          )}
        </div>
      </div>

      {/* ── Painel lateral ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Detalhe do evento clicado */}
        {detalheEvento && (
          <div className="card" style={{ borderLeft: `4px solid ${corPorTipo(detalheEvento.tipo)}` }}>
            <div className="card-body" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                  fontSize: 11, fontWeight: 700,
                  background: corPorTipo(detalheEvento.tipo) + '22',
                  color: corPorTipo(detalheEvento.tipo)
                }}>
                  {tipoLabel(detalheEvento.tipo)}
                </span>
                <button className="modal-close" onClick={() => setDetalheEvento(null)}>✕</button>
              </div>

              <h3 style={{ fontSize: 17, marginBottom: 10, color: 'var(--gray-800)' }}>{detalheEvento.titulo}</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, color: 'var(--gray-500)' }}>
                  <span>📅</span>
                  <span>
                    {new Date(detalheEvento.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {detalheEvento.data_fim && detalheEvento.data_fim !== detalheEvento.data_inicio &&
                      ` até ${new Date(detalheEvento.data_fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`
                    }
                  </span>
                </div>
                {detalheEvento.turma && (
                  <div style={{ display: 'flex', gap: 8, color: 'var(--gray-500)' }}>
                    <span>🏫</span>
                    <span>{detalheEvento.turma}</span>
                  </div>
                )}
                {detalheEvento.descricao && (
                  <div style={{ color: 'var(--gray-600)', marginTop: 4, lineHeight: 1.6 }}>
                    {detalheEvento.descricao}
                  </div>
                )}
              </div>

              {podeEditar && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => abrirModal(detalheEvento)}>✏️ Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => excluir(detalheEvento.id)}>🗑️</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Próximos eventos */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h2 style={{ fontSize: 16 }}>Próximos Eventos</h2>
          </div>
          <div>
            {proximosEventos.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
                Nenhum evento próximo
              </div>
            ) : (
              proximosEventos.map((ev, i) => (
                <div
                  key={ev.id}
                  onClick={() => setDetalheEvento(ev)}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 20px',
                    borderBottom: i < proximosEventos.length - 1 ? '1px solid var(--gray-100)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: corPorTipo(ev.tipo) + '22',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>
                      {TIPOS.find(t => t.value === ev.tipo)?.label.split(' ')[0] || '📅'}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.titulo}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                      {new Date(ev.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: corPorTipo(ev.tipo), marginTop: 6
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resumo por tipo */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h2 style={{ fontSize: 16 }}>Resumo</h2>
          </div>
          <div style={{ padding: '8px 20px 16px' }}>
            {TIPOS.map(t => {
              const count = eventos.filter(e => e.tipo === t.value).length;
              if (!count) return null;
              return (
                <div key={t.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{t.label}</span>
                  <span style={{
                    minWidth: 24, height: 24, borderRadius: 99, background: t.cor + '22',
                    color: t.cor, fontWeight: 700, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px'
                  }}>{count}</span>
                </div>
              );
            })}
            {eventos.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>
                Nenhum evento cadastrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal criar/editar ── */}
      {modalOpen && podeEditar && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>{editando ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {erro}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Título *</label>
                  <input className="form-input" name="titulo" value={form.titulo} onChange={handleChange} placeholder="Ex: Prova de Matemática — 9º Ano" />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" name="tipo" value={form.tipo} onChange={handleChange}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Turma (opcional)</label>
                  <input className="form-input" name="turma" value={form.turma} onChange={handleChange} placeholder="Ex: 9º Ano A" />
                </div>

                <div className="form-group">
                  <label className="form-label">Data início *</label>
                  <input className="form-input" type="date" name="data_inicio" value={form.data_inicio} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Data fim</label>
                  <input className="form-input" type="date" name="data_fim" value={form.data_fim} onChange={handleChange} />
                </div>

                <div className="form-group full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox" id="dia_todo" name="dia_todo"
                    checked={form.dia_todo} onChange={handleChange}
                    style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
                  />
                  <label htmlFor="dia_todo" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    Evento de dia inteiro
                  </label>
                </div>

                <div className="form-group full">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-textarea" name="descricao" value={form.descricao} onChange={handleChange} placeholder="Detalhes do evento..." rows={3} />
                </div>
              </div>

              {/* Preview da cor */}
              {form.tipo && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 8,
                  background: corPorTipo(form.tipo) + '15',
                  borderLeft: `3px solid ${corPorTipo(form.tipo)}`,
                  fontSize: 13, color: 'var(--gray-700)'
                }}>
                  {tipoLabel(form.tipo)} · {form.titulo || 'Sem título'} · {form.data_inicio || '—'}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {editando && (
                <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => excluir(editando.id)}>
                  🗑️ Excluir
                </button>
              )}
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? '✓ Salvar' : '+ Criar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
