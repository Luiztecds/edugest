import { jsPDF } from 'jspdf';

const DISCIPLINAS = [
  'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
  'Física', 'Química', 'Biologia', 'Inglês', 'Educação Física'
];
const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

// Cores em RGB
const COR_NAVY    = [15, 28, 46];
const COR_TEAL    = [0, 201, 177];
const COR_GREEN   = [16, 185, 129];
const COR_ROSE    = [244, 63, 94];
const COR_AMBER   = [245, 158, 11];
const COR_GRAY_50 = [248, 250, 252];
const COR_GRAY_200= [226, 232, 240];
const COR_GRAY_500= [100, 116, 139];
const COR_GRAY_700= [51, 65, 85];
const COR_WHITE   = [255, 255, 255];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}

function corNota(nota) {
  const n = parseFloat(nota);
  if (n >= 7) return COR_GREEN;
  if (n >= 5) return COR_AMBER;
  return COR_ROSE;
}

function calcMedia(notasArr) {
  if (!notasArr.length) return null;
  return (notasArr.reduce((s, n) => s + parseFloat(n.nota), 0) / notasArr.length).toFixed(1);
}

export function gerarBoletimPDF({ aluno, turma, notas, frequencia, nomeEscola = 'EduGest Escola' }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margem = 16;
  let y = 0;

  // ── CABEÇALHO ──────────────────────────────────────────────
  doc.setFillColor(...COR_NAVY);
  doc.rect(0, 0, W, 42, 'F');

  // Ícone escola
  doc.setFillColor(...COR_TEAL);
  doc.roundedRect(margem, 9, 22, 22, 3, 3, 'F');
  doc.setTextColor(...COR_NAVY);
  doc.setFontSize(16);
  doc.text('🎓', margem + 4, 23);

  // Nome da escola
  doc.setTextColor(...COR_WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(nomeEscola, margem + 27, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COR_TEAL);
  doc.text('BOLETIM ESCOLAR', margem + 27, 25);

  // Data emissão
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(150, 170, 190);
  doc.setFontSize(8);
  doc.text(`Emitido em ${dataEmissao}`, W - margem, 35, { align: 'right' });

  y = 52;

  // ── DADOS DO ALUNO ─────────────────────────────────────────
  doc.setFillColor(...COR_GRAY_50);
  doc.roundedRect(margem, y, W - margem * 2, 24, 3, 3, 'F');
  doc.setDrawColor(...COR_TEAL);
  doc.setLineWidth(0.8);
  doc.line(margem, y, margem, y + 24);

  doc.setTextColor(...COR_GRAY_500);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('ALUNO', margem + 5, y + 7);
  doc.text('TURMA', margem + 80, y + 7);
  doc.text('ANO LETIVO', margem + 135, y + 7);

  doc.setTextColor(...COR_NAVY);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(aluno.nome || '—', margem + 5, y + 17);

  doc.setFontSize(11);
  doc.text(turma?.nome || '—', margem + 80, y + 17);
  doc.text(turma?.ano || new Date().getFullYear().toString(), margem + 135, y + 17);

  y += 32;

  // ── TÍTULO NOTAS ───────────────────────────────────────────
  doc.setTextColor(...COR_NAVY);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Notas por Disciplina', margem, y);

  // Linha decorativa
  doc.setDrawColor(...COR_TEAL);
  doc.setLineWidth(1.5);
  doc.line(margem, y + 3, margem + 50, y + 3);

  y += 10;

  // ── TABELA DE NOTAS ────────────────────────────────────────
  const colDisciplina = margem;
  const colBim = [80, 105, 130, 155];
  const colMedia = 172;
  const colSit = 188;

  // Header da tabela
  doc.setFillColor(...COR_NAVY);
  doc.rect(margem, y, W - margem * 2, 8, 'F');

  doc.setTextColor(...COR_WHITE);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DISCIPLINA', colDisciplina + 2, y + 5.5);
  BIMESTRES.forEach((b, i) => doc.text(b.replace('º ', 'º\n').split('\n')[0] + 'Bim', colBim[i] + 2, y + 5.5));
  doc.text('MÉDIA', colMedia + 1, y + 5.5);
  doc.text('SIT.', colSit + 1, y + 5.5);

  y += 8;

  // Linhas por disciplina
  const disciplinasComNota = DISCIPLINAS.filter(d => notas.some(n => n.disciplina === d));

  disciplinasComNota.forEach((disc, idx) => {
    const notasDisc = notas.filter(n => n.disciplina === disc);
    const media = calcMedia(notasDisc);
    const sit = media !== null ? (parseFloat(media) >= 6 ? 'APR' : 'REP') : '—';

    // Linha zebra
    if (idx % 2 === 0) {
      doc.setFillColor(...COR_GRAY_50);
      doc.rect(margem, y, W - margem * 2, 8, 'F');
    }

    // Borda inferior
    doc.setDrawColor(...COR_GRAY_200);
    doc.setLineWidth(0.2);
    doc.line(margem, y + 8, W - margem, y + 8);

    // Nome disciplina
    doc.setTextColor(...COR_GRAY_700);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(disc, colDisciplina + 2, y + 5.5);

    // Notas por bimestre
    BIMESTRES.forEach((bim, i) => {
      const notaBim = notasDisc.find(n => n.bimestre === bim);
      if (notaBim) {
        const cor = corNota(notaBim.nota);
        doc.setTextColor(...cor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(parseFloat(notaBim.nota).toFixed(1), colBim[i] + 2, y + 5.5);
      } else {
        doc.setTextColor(...COR_GRAY_500);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('—', colBim[i] + 2, y + 5.5);
      }
    });

    // Média
    if (media !== null) {
      const corM = corNota(media);
      doc.setFillColor(...corM.map(c => Math.min(255, c + 180)));
      doc.roundedRect(colMedia, y + 1, 14, 6, 1.5, 1.5, 'F');
      doc.setTextColor(...corM);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(media, colMedia + 3, y + 5.5);
    }

    // Situação
    if (sit !== '—') {
      const isApr = sit === 'APR';
      doc.setFillColor(...(isApr ? COR_GREEN : COR_ROSE).map(c => Math.min(255, c + 160)));
      doc.roundedRect(colSit, y + 1, 10, 6, 1.5, 1.5, 'F');
      doc.setTextColor(...(isApr ? COR_GREEN : COR_ROSE));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(sit, colSit + 1.5, y + 5.5);
    }

    y += 8;
  });

  if (disciplinasComNota.length === 0) {
    doc.setTextColor(...COR_GRAY_500);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Nenhuma nota lançada ainda.', margem + 2, y + 6);
    y += 14;
  }

  y += 10;

  // ── RESULTADO GERAL ────────────────────────────────────────
  if (disciplinasComNota.length > 0) {
    const todasMedias = disciplinasComNota
      .map(d => calcMedia(notas.filter(n => n.disciplina === d)))
      .filter(Boolean)
      .map(Number);

    if (todasMedias.length > 0) {
      const mediaGeral = (todasMedias.reduce((a, b) => a + b, 0) / todasMedias.length).toFixed(1);
      const aprovado   = parseFloat(mediaGeral) >= 6;

      const corResultado = aprovado ? COR_GREEN : COR_ROSE;
      doc.setFillColor(...corResultado);
      doc.roundedRect(margem, y, W - margem * 2, 16, 3, 3, 'F');

      doc.setTextColor(...COR_WHITE);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(aprovado ? '✓  APROVADO' : '✗  REPROVADO', margem + 6, y + 10);

      doc.setFontSize(9);
      doc.text(`Média Geral: ${mediaGeral}`, W - margem - 6, y + 10, { align: 'right' });

      y += 24;
    }
  }

  // ── FREQUÊNCIA ─────────────────────────────────────────────
  if (frequencia && frequencia.length > 0) {
    doc.setTextColor(...COR_NAVY);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Frequência', margem, y);
    doc.setDrawColor(...COR_TEAL);
    doc.setLineWidth(1.5);
    doc.line(margem, y + 3, margem + 30, y + 3);
    y += 12;

    const totalAulas    = frequencia.length;
    const totalPresente = frequencia.filter(f => f.status === 'presente').length;
    const totalFalta    = totalAulas - totalPresente;
    const pct           = Math.round(totalPresente / totalAulas * 100);
    const corPct        = pct >= 75 ? COR_GREEN : pct >= 50 ? COR_AMBER : COR_ROSE;

    const boxW = (W - margem * 2 - 12) / 4;
    const items = [
      { label: 'Total de Aulas', valor: totalAulas, cor: COR_NAVY },
      { label: 'Presenças',      valor: totalPresente, cor: COR_GREEN },
      { label: 'Faltas',         valor: totalFalta,    cor: COR_ROSE },
      { label: 'Frequência',     valor: `${pct}%`,     cor: corPct },
    ];

    items.forEach((item, i) => {
      const x = margem + i * (boxW + 4);
      doc.setFillColor(...COR_GRAY_50);
      doc.roundedRect(x, y, boxW, 18, 2, 2, 'F');
      doc.setDrawColor(...item.cor);
      doc.setLineWidth(0.8);
      doc.line(x, y, x, y + 18);

      doc.setTextColor(...COR_GRAY_500);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label.toUpperCase(), x + 4, y + 6);

      doc.setTextColor(...item.cor);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(item.valor.toString(), x + 4, y + 15);
    });

    y += 24;

    // Barra de progresso
    const barW = W - margem * 2;
    doc.setFillColor(...COR_GRAY_200);
    doc.roundedRect(margem, y, barW, 5, 2, 2, 'F');
    doc.setFillColor(...corPct);
    doc.roundedRect(margem, y, barW * (pct / 100), 5, 2, 2, 'F');

    doc.setTextColor(...COR_GRAY_500);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const statusFreq = pct >= 75 ? '✓ Frequência regular' : '⚠ Frequência irregular — mínimo exigido: 75%';
    doc.text(statusFreq, margem, y + 11);

    y += 16;
  }

  // ── RODAPÉ ─────────────────────────────────────────────────
  const rodapeY = 285;
  doc.setDrawColor(...COR_GRAY_200);
  doc.setLineWidth(0.3);
  doc.line(margem, rodapeY, W - margem, rodapeY);

  doc.setTextColor(...COR_GRAY_500);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${nomeEscola} · Documento gerado automaticamente pelo sistema EduGest`, margem, rodapeY + 5);
  doc.text(`Página 1`, W - margem, rodapeY + 5, { align: 'right' });

  // ── DOWNLOAD ───────────────────────────────────────────────
  const nomeArquivo = `boletim-${(aluno.nome || 'aluno').toLowerCase().replace(/\s+/g, '-')}.pdf`;
  doc.save(nomeArquivo);
}
