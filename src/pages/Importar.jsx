import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { alunosService, professoresService, turmasService } from '../services/supabase';

// ── Mapeamento flexível de colunas ──────────────────────────
// O usuário pode ter nomes variados; normalizamos tudo para minúsculo e comparamos

const MAP_ALUNOS = {
  nome:             ['nome', 'name', 'aluno', 'estudante'],
  email:            ['email', 'e-mail', 'e mail', 'correio'],
  data_nascimento:  ['data de nascimento', 'nascimento', 'data nasc', 'dt nasc', 'data_nascimento', 'datanascimento'],
  telefone:         ['telefone', 'fone', 'celular', 'tel', 'phone'],
  endereco:         ['endereço', 'endereco', 'address', 'end'],
  turma:            ['turma', 'classe', 'class', 'turma/série', 'turma/serie'],
};

const MAP_PROFESSORES = {
  nome:       ['nome', 'name', 'professor', 'docente'],
  email:      ['email', 'e-mail', 'e mail', 'correio'],
  disciplina: ['disciplina', 'matéria', 'materia', 'subject', 'área', 'area'],
  telefone:   ['telefone', 'fone', 'celular', 'tel', 'phone'],
};

function detectarCampo(header, mapa) {
  const h = header.toLowerCase().trim();
  for (const [campo, aliases] of Object.entries(mapa)) {
    if (aliases.some(a => h.includes(a))) return campo;
  }
  return null;
}

function mapearColunas(headers, mapa) {
  // Retorna { campo: índiceColuna }
  const resultado = {};
  headers.forEach((h, i) => {
    const campo = detectarCampo(String(h), mapa);
    if (campo && !(campo in resultado)) resultado[campo] = i;
  });
  return resultado;
}

// Normalizar data — aceita dd/mm/yyyy, yyyy-mm-dd, número serial Excel
function normalizarData(val) {
  if (!val) return null;
  // Número serial Excel
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // dd/mm/yyyy
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

function lerLinhas(sheet, mapa) {
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (json.length < 2) return { mapeamento: {}, linhas: [] };

  const headers   = json[0].map(String);
  const mapeamento = mapearColunas(headers, mapa);
  const linhas = [];

  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    // Pula linhas totalmente vazias
    if (row.every(c => !String(c).trim())) continue;
    const obj = { _linha: i + 1 };
    for (const [campo, col] of Object.entries(mapeamento)) {
      obj[campo] = String(row[col] ?? '').trim();
    }
    linhas.push(obj);
  }

  return { mapeamento, headers, linhas };
}

function validarAluno(a) {
  const erros = [];
  if (!a.nome) erros.push('Nome obrigatório');
  if (a.data_nascimento && !normalizarData(a.data_nascimento)) erros.push('Data inválida');
  return erros;
}

function validarProfessor(p) {
  const erros = [];
  if (!p.nome) erros.push('Nome obrigatório');
  return erros;
}

const STATUS_CORES = {
  pendente:  { bg: 'var(--gray-100)',   cor: 'var(--gray-500)',  icone: '○' },
  ok:        { bg: 'var(--green-light)', cor: '#065f46',          icone: '✓' },
  erro:      { bg: 'var(--rose-light)', cor: '#be123c',          icone: '✗' },
  aviso:     { bg: 'var(--amber-light)', cor: '#92400e',          icone: '⚠' },
  importado: { bg: 'var(--teal-light)', cor: 'var(--teal-dark)', icone: '✓' },
};

function Badge({ status, texto }) {
  const s = STATUS_CORES[status] || STATUS_CORES.pendente;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.cor
    }}>
      {s.icone} {texto}
    </span>
  );
}

export default function Importar() {
  const fileRef = useRef(null);
  const [arquivo, setArquivo]   = useState(null);
  const [abas, setAbas]         = useState([]);     // nomes das abas
  const [abaAlunos, setAbaAlunos]   = useState('');
  const [abaProfessores, setAbaProfessores] = useState('');
  const [workbook, setWorkbook] = useState(null);

  const [dadosAlunos, setDadosAlunos]         = useState(null);
  const [dadosProfessores, setDadosProfessores] = useState(null);
  const [turmasExistentes, setTurmasExistentes] = useState([]);

  const [statusLinhasAlunos, setStatusLinhasAlunos]         = useState([]);
  const [statusLinhasProfessores, setStatusLinhasProfessores] = useState([]);

  const [importando, setImportando] = useState(false);
  const [etapa, setEtapa]           = useState('upload'); // upload | preview | resultado
  const [resumo, setResumo]         = useState(null);

  // ── 1. Ler arquivo ──
  const onArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setEtapa('upload');
    setDadosAlunos(null); setDadosProfessores(null);

    const buffer = await file.arrayBuffer();
    const wb     = XLSX.read(buffer);
    setWorkbook(wb);
    setAbas(wb.SheetNames);

    // Auto-detectar abas por nome
    const nomes = wb.SheetNames.map(n => n.toLowerCase());
    const iA = nomes.findIndex(n => n.includes('aluno') || n.includes('student'));
    const iP = nomes.findIndex(n => n.includes('professor') || n.includes('docente') || n.includes('teacher'));
    setAbaAlunos(iA >= 0 ? wb.SheetNames[iA] : wb.SheetNames[0] || '');
    setAbaProfessores(iP >= 0 ? wb.SheetNames[iP] : wb.SheetNames[1] || wb.SheetNames[0] || '');
  };

  // ── 2. Gerar preview ──
  const gerarPreview = async () => {
    if (!workbook) return;

    // Carregar turmas para sugestão de auto-criação
    try {
      const t = await turmasService.listar();
      setTurmasExistentes(t.map(x => x.nome.toLowerCase()));
    } catch {}

    // Alunos
    if (abaAlunos && workbook.Sheets[abaAlunos]) {
      const { linhas } = lerLinhas(workbook.Sheets[abaAlunos], MAP_ALUNOS);
      const status = linhas.map(l => {
        const erros = validarAluno(l);
        return { ...l, _erros: erros, _status: erros.length ? 'erro' : 'ok' };
      });
      setDadosAlunos(status);
      setStatusLinhasAlunos(status.map(s => s._status));
    }

    // Professores
    if (abaProfessores && workbook.Sheets[abaProfessores] && abaProfessores !== abaAlunos) {
      const { linhas } = lerLinhas(workbook.Sheets[abaProfessores], MAP_PROFESSORES);
      const status = linhas.map(l => {
        const erros = validarProfessor(l);
        return { ...l, _erros: erros, _status: erros.length ? 'erro' : 'ok' };
      });
      setDadosProfessores(status);
      setStatusLinhasProfessores(status.map(s => s._status));
    }

    setEtapa('preview');
  };

  // ── 3. Importar ──
  const importar = async () => {
    setImportando(true);
    let okAlunos = 0, erroAlunos = 0, okProf = 0, erroProf = 0;

    // Alunos
    if (dadosAlunos) {
      const novosStatus = [...statusLinhasAlunos];
      for (let i = 0; i < dadosAlunos.length; i++) {
        const linha = dadosAlunos[i];
        if (linha._status === 'erro') { erroAlunos++; continue; }

        // Buscar turma_id pelo nome
        let turma_id = null;
        if (linha.turma) {
          try {
            const turmas = await turmasService.listar();
            const t = turmas.find(x => x.nome.toLowerCase() === linha.turma.toLowerCase());
            turma_id = t?.id || null;
          } catch {}
        }

        try {
          await alunosService.criar({
            nome:            linha.nome,
            email:           linha.email || null,
            data_nascimento: normalizarData(linha.data_nascimento),
            telefone:        linha.telefone || null,
            endereco:        linha.endereco || null,
            turma_id,
          });
          novosStatus[i] = 'importado';
          okAlunos++;
        } catch (e) {
          novosStatus[i] = 'erro';
          dadosAlunos[i]._erros = [e.message];
          erroAlunos++;
        }
      }
      setStatusLinhasAlunos([...novosStatus]);
    }

    // Professores
    if (dadosProfessores) {
      const novosStatus = [...statusLinhasProfessores];
      for (let i = 0; i < dadosProfessores.length; i++) {
        const linha = dadosProfessores[i];
        if (linha._status === 'erro') { erroProf++; continue; }
        try {
          await professoresService.criar({
            nome:       linha.nome,
            email:      linha.email || null,
            disciplina: linha.disciplina || null,
            telefone:   linha.telefone || null,
          });
          novosStatus[i] = 'importado';
          okProf++;
        } catch (e) {
          novosStatus[i] = 'erro';
          dadosProfessores[i]._erros = [e.message];
          erroProf++;
        }
      }
      setStatusLinhasProfessores([...novosStatus]);
    }

    setResumo({ okAlunos, erroAlunos, okProf, erroProf });
    setImportando(false);
    setEtapa('resultado');
  };

  const reiniciar = () => {
    setArquivo(null); setWorkbook(null); setAbas([]);
    setDadosAlunos(null); setDadosProfessores(null);
    setEtapa('upload'); setResumo(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const totalOk    = (dadosAlunos || []).filter((_,i) => statusLinhasAlunos[i] === 'ok' || statusLinhasAlunos[i] === 'importado').length
                   + (dadosProfessores || []).filter((_,i) => statusLinhasProfessores[i] === 'ok' || statusLinhasProfessores[i] === 'importado').length;
  const totalErro  = (dadosAlunos || []).filter((_,i) => statusLinhasAlunos[i] === 'erro').length
                   + (dadosProfessores || []).filter((_,i) => statusLinhasProfessores[i] === 'erro').length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Stepper ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 }}>
        {[
          { id: 'upload',    label: '1. Upload', icone: '📂' },
          { id: 'preview',   label: '2. Preview', icone: '🔍' },
          { id: 'resultado', label: '3. Resultado', icone: '✅' },
        ].map((s, i, arr) => {
          const ativo    = etapa === s.id;
          const concluido = arr.findIndex(x => x.id === etapa) > i;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                background: ativo ? 'var(--teal-light)' : concluido ? 'var(--green-light)' : 'var(--gray-100)',
                color: ativo ? 'var(--teal-dark)' : concluido ? '#065f46' : 'var(--gray-400)',
                fontWeight: ativo ? 700 : 500, fontSize: 13,
                transition: 'all 0.3s'
              }}>
                <span>{concluido ? '✓' : s.icone}</span>
                {s.label}
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: 2, background: concluido ? '#10b981' : 'var(--gray-200)', margin: '0 4px', transition: 'background 0.3s' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── ETAPA 1: Upload ── */}
      {etapa === 'upload' && (
        <div className="card">
          <div className="card-header"><h2>Selecionar Planilha</h2></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--teal)'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--gray-200)';
                const f = e.dataTransfer.files[0];
                if (f) { const inp = fileRef.current; inp.files = e.dataTransfer.files; onArquivo({ target: inp }); }
              }}
              style={{
                border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius)',
                padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s', background: arquivo ? 'var(--teal-light)' : 'var(--gray-50)'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>{arquivo ? '📊' : '📂'}</div>
              {arquivo ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--teal-dark)', marginBottom: 4 }}>{arquivo.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                    {(arquivo.size / 1024).toFixed(1)} KB · {abas.length} aba{abas.length !== 1 ? 's' : ''} detectada{abas.length !== 1 ? 's' : ''}
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={e => { e.stopPropagation(); reiniciar(); }}>
                    Trocar arquivo
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--gray-600)', marginBottom: 4 }}>
                    Arraste sua planilha ou clique para selecionar
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                    Aceita .xlsx e .xls
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={onArquivo} />

            {/* Seleção de abas */}
            {abas.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Aba com dados de Alunos</label>
                  <select className="form-select" value={abaAlunos} onChange={e => setAbaAlunos(e.target.value)}>
                    <option value="">— Não importar alunos —</option>
                    {abas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Aba com dados de Professores</label>
                  <select className="form-select" value={abaProfessores} onChange={e => setAbaProfessores(e.target.value)}>
                    <option value="">— Não importar professores —</option>
                    {abas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Dica de formato */}
            <div style={{ background: 'var(--blue-light)', borderRadius: 'var(--radius-sm)', padding: '14px 18px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>💡 Formato esperado</div>
              <div style={{ color: '#1e3a8a', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Alunos:</strong> Nome · E-mail · Data de Nascimento · Telefone · Endereço · Turma</div>
                <div><strong>Professores:</strong> Nome · E-mail · Disciplina · Telefone</div>
                <div style={{ marginTop: 4, color: '#3b82f6' }}>Os nomes das colunas não precisam ser exatos — o sistema detecta automaticamente.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={gerarPreview}
                disabled={!arquivo || (!abaAlunos && !abaProfessores)}
              >
                🔍 Gerar Preview →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ETAPA 2: Preview ── */}
      {etapa === 'preview' && (
        <>
          {/* Resumo rápido */}
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { label: 'Alunos encontrados',     val: dadosAlunos?.length ?? 0,                                                  cor: '#3b82f6',  bg: '#dbeafe' },
              { label: 'Professores encontrados', val: dadosProfessores?.length ?? 0,                                             cor: '#8b5cf6',  bg: '#ede9fe' },
              { label: 'Prontos para importar',  val: totalOk,                                                                    cor: '#10b981',  bg: '#d1fae5' },
              { label: 'Com erro',               val: totalErro,                                                                  cor: '#f43f5e',  bg: '#ffe4e9' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, padding: '14px 18px', borderRadius: 'var(--radius)',
                background: s.bg, display: 'flex', flexDirection: 'column', gap: 4
              }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.cor }}>{s.val}</div>
                <div style={{ fontSize: 12, color: s.cor, fontWeight: 600, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabela Alunos */}
          {dadosAlunos && dadosAlunos.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2>👨‍🎓 Alunos — {dadosAlunos.length} registros</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge status="ok" texto={`${dadosAlunos.filter((_,i) => statusLinhasAlunos[i]==='ok').length} ok`} />
                  {totalErro > 0 && <Badge status="erro" texto={`${dadosAlunos.filter((_,i) => statusLinhasAlunos[i]==='erro').length} erro`} />}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Nascimento</th>
                      <th>Telefone</th>
                      <th>Turma</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosAlunos.map((a, i) => (
                      <tr key={i} style={{ background: statusLinhasAlunos[i] === 'erro' ? '#fff5f5' : undefined }}>
                        <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{a._linha}</td>
                        <td style={{ fontWeight: 600 }}>{a.nome || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>{a.email || '—'}</td>
                        <td style={{ fontSize: 13 }}>{a.data_nascimento || '—'}</td>
                        <td style={{ fontSize: 13 }}>{a.telefone || '—'}</td>
                        <td>
                          {a.turma ? (
                            <span className={`badge ${turmasExistentes.includes(a.turma?.toLowerCase()) ? 'badge-teal' : 'badge-gray'}`}>
                              {a.turma}
                              {!turmasExistentes.includes(a.turma?.toLowerCase()) && ' ⚠'}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {statusLinhasAlunos[i] === 'erro'
                            ? <Badge status="erro" texto={a._erros?.join(', ')} />
                            : <Badge status="ok" texto="OK" />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dadosAlunos.some(a => a.turma && !turmasExistentes.includes(a.turma?.toLowerCase())) && (
                <div style={{ padding: '10px 16px', background: 'var(--amber-light)', fontSize: 13, color: '#92400e', borderTop: '1px solid var(--gray-100)' }}>
                  ⚠️ Turmas marcadas com ⚠ não existem ainda. O aluno será importado sem turma — associe manualmente depois.
                </div>
              )}
            </div>
          )}

          {/* Tabela Professores */}
          {dadosProfessores && dadosProfessores.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2>👨‍🏫 Professores — {dadosProfessores.length} registros</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge status="ok" texto={`${dadosProfessores.filter((_,i) => statusLinhasProfessores[i]==='ok').length} ok`} />
                  {dadosProfessores.filter((_,i) => statusLinhasProfessores[i]==='erro').length > 0 &&
                    <Badge status="erro" texto={`${dadosProfessores.filter((_,i) => statusLinhasProfessores[i]==='erro').length} erro`} />}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Disciplina</th>
                      <th>Telefone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosProfessores.map((p, i) => (
                      <tr key={i} style={{ background: statusLinhasProfessores[i] === 'erro' ? '#fff5f5' : undefined }}>
                        <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{p._linha}</td>
                        <td style={{ fontWeight: 600 }}>{p.nome || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>{p.email || '—'}</td>
                        <td><span className="badge badge-amber">{p.disciplina || '—'}</span></td>
                        <td style={{ fontSize: 13 }}>{p.telefone || '—'}</td>
                        <td>
                          {statusLinhasProfessores[i] === 'erro'
                            ? <Badge status="erro" texto={p._erros?.join(', ')} />
                            : <Badge status="ok" texto="OK" />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setEtapa('upload')}>← Voltar</button>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {totalErro > 0 && (
                <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  {totalErro} registro{totalErro > 1 ? 's' : ''} com erro será{totalErro > 1 ? 'ão' : ''} ignorado{totalErro > 1 ? 's' : ''}
                </span>
              )}
              <button
                className="btn btn-primary"
                onClick={importar}
                disabled={importando || totalOk === 0}
              >
                {importando ? '⏳ Importando...' : `📥 Importar ${totalOk} registro${totalOk !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ETAPA 3: Resultado ── */}
      {etapa === 'resultado' && resumo && (
        <div className="card">
          <div className="card-body" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {resumo.erroAlunos + resumo.erroProf === 0 ? '🎉' : '⚠️'}
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>
              {resumo.erroAlunos + resumo.erroProf === 0 ? 'Importação concluída!' : 'Importação concluída com avisos'}
            </h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>
              Confira abaixo o resultado linha a linha
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
              {[
                { label: 'Alunos importados',     val: resumo.okAlunos,   cor: '#10b981', bg: '#d1fae5' },
                { label: 'Alunos com erro',        val: resumo.erroAlunos, cor: '#f43f5e', bg: '#ffe4e9' },
                { label: 'Professores importados', val: resumo.okProf,     cor: '#10b981', bg: '#d1fae5' },
                { label: 'Professores com erro',   val: resumo.erroProf,   cor: '#f43f5e', bg: '#ffe4e9' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '16px 24px', borderRadius: 'var(--radius)',
                  background: s.bg, minWidth: 140
                }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.cor }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: s.cor, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Linhas com erro */}
            {(statusLinhasAlunos.some(s => s === 'erro') || statusLinhasProfessores.some(s => s === 'erro')) && (
              <div style={{ textAlign: 'left', marginBottom: 24, maxWidth: 600, margin: '0 auto 24px' }}>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Registros com erro:</div>
                {dadosAlunos?.map((a, i) => statusLinhasAlunos[i] === 'erro' && (
                  <div key={i} style={{ padding: '8px 12px', background: 'var(--rose-light)', borderRadius: 6, marginBottom: 6, fontSize: 13, color: '#be123c' }}>
                    Aluno linha {a._linha} — <strong>{a.nome || 'sem nome'}</strong>: {a._erros?.join(', ')}
                  </div>
                ))}
                {dadosProfessores?.map((p, i) => statusLinhasProfessores[i] === 'erro' && (
                  <div key={i} style={{ padding: '8px 12px', background: 'var(--rose-light)', borderRadius: 6, marginBottom: 6, fontSize: 13, color: '#be123c' }}>
                    Professor linha {p._linha} — <strong>{p.nome || 'sem nome'}</strong>: {p._erros?.join(', ')}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={reiniciar}>📂 Importar outra planilha</button>
              <a href="/alunos" className="btn btn-primary">Ver Alunos →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
