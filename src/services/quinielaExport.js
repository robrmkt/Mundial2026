function slug(value) {
  return String(value || 'quiniela')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function parseScore(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function matchPoints(prediction, match) {
  if (!prediction || match.status === 'SCHEDULED') return '';

  const pHome = parseScore(prediction.homeScore);
  const pAway = parseScore(prediction.awayScore);
  const mHome = parseScore(match.homeScore);
  const mAway = parseScore(match.awayScore);
  if ([pHome, pAway, mHome, mAway].some(value => value === null)) return '';

  if (pHome === mHome && pAway === mAway) return 3;
  return Math.sign(pHome - pAway) === Math.sign(mHome - mAway) ? 1 : 0;
}

function matchOutcome(points, match) {
  if (match.status === 'SCHEDULED') return 'Pendiente';
  if (points === 3) return 'Exacto';
  if (points === 1) return 'Resultado';
  if (points === 0) return 'Fallado';
  return 'Sin dato';
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function participantStats(participant, matches) {
  let points = 0;
  let exact = 0;
  let outcome = 0;
  let played = 0;
  let predicted = 0;

  matches.forEach(match => {
    const prediction = participant.predictions?.[match.id];
    if (!prediction) return;
    predicted += 1;
    const matchScore = matchPoints(prediction, match);
    if (matchScore === '') return;
    played += 1;
    points += matchScore;
    if (matchScore === 3) exact += 1;
    if (matchScore === 1) outcome += 1;
  });

  return {
    points,
    exact,
    outcome,
    played,
    predicted,
    effectiveness: played ? Math.round(((exact + outcome) / played) * 100) : 0
  };
}

function participantRows(participant, matches) {
  return matches.map(match => {
    const prediction = participant.predictions?.[match.id];
    const points = matchPoints(prediction, match);
    return {
      '#': match.id,
      Jornada: match.id <= 24 ? 'Jornada 1' : match.id <= 48 ? 'Jornada 2' : 'Jornada 3',
      Fecha: match.date || formatDate(match.kickoff),
      Estado: match.status === 'LIVE' ? 'En vivo' : match.status === 'FINISHED' ? 'Finalizado' : 'Pendiente',
      Local: match.homeTeam,
      Visitante: match.awayTeam,
      'Pronóstico': prediction ? `${prediction.homeScore}-${prediction.awayScore}` : '',
      'Marcador real': match.status === 'SCHEDULED' ? '' : `${match.homeScore ?? ''}-${match.awayScore ?? ''}`,
      Resultado: matchOutcome(points, match),
      Puntos: points
    };
  });
}

function autoWidth(rows) {
  const keys = Object.keys(rows[0] || {});
  return keys.map(key => ({
    wch: Math.min(
      38,
      Math.max(
        String(key).length + 2,
        ...rows.map(row => String(row[key] ?? '').length + 2)
      )
    )
  }));
}

async function createWorkbook() {
  const XLSX = await import('xlsx');
  return { XLSX, workbook: XLSX.utils.book_new() };
}

function appendJsonSheet(XLSX, workbook, rows, name) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = autoWidth(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function uniqueSheetName(workbook, preferredName) {
  const clean = String(preferredName || 'Hoja').replace(/[\\/?*[\]:]/g, ' ').trim() || 'Hoja';
  const existing = new Set(workbook.SheetNames);
  let name = clean.slice(0, 31);
  let i = 2;
  while (existing.has(name)) {
    const suffix = ` ${i}`;
    name = `${clean.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  return name;
}

async function downloadWorkbook(XLSX, workbook, fileName) {
  XLSX.writeFile(workbook, fileName, { compression: true });
}

export async function exportParticipantQuiniela(participant, matches) {
  if (!participant) throw new Error('No hay participante para exportar.');

  const { XLSX, workbook } = await createWorkbook();
  const stats = participantStats(participant, matches);
  appendJsonSheet(XLSX, workbook, [
    { Campo: 'Participante', Valor: participant.name },
    { Campo: 'Pronósticos capturados', Valor: stats.predicted },
    { Campo: 'Partidos evaluados', Valor: stats.played },
    { Campo: 'Puntos', Valor: stats.points },
    { Campo: 'Marcadores exactos', Valor: stats.exact },
    { Campo: 'Resultados acertados', Valor: stats.outcome },
    { Campo: 'Efectividad', Valor: `${stats.effectiveness}%` },
    { Campo: 'Tiene foto/ficha', Valor: participant.photo ? 'Sí' : 'No' },
    { Campo: 'Generado', Valor: new Date().toLocaleString('es-MX') }
  ], 'Resumen');
  appendJsonSheet(XLSX, workbook, participantRows(participant, matches), 'Quiniela');

  await downloadWorkbook(XLSX, workbook, `quiniela-mundial26-${slug(participant.name)}.xlsx`);
}

export async function exportAllQuinielas(participants, matches) {
  const { XLSX, workbook } = await createWorkbook();
  const ranked = participants
    .map(participant => ({ participant, stats: participantStats(participant, matches) }))
    .sort((a, b) => b.stats.points - a.stats.points || b.stats.exact - a.stats.exact || b.stats.effectiveness - a.stats.effectiveness);

  appendJsonSheet(XLSX, workbook, ranked.map(({ participant, stats }, index) => ({
    Posición: index + 1,
    Participante: participant.name,
    Pronósticos: stats.predicted,
    Evaluados: stats.played,
    Puntos: stats.points,
    Exactos: stats.exact,
    Resultados: stats.outcome,
    Efectividad: `${stats.effectiveness}%`,
    'Tiene foto/ficha': participant.photo ? 'Sí' : 'No'
  })), 'Resumen general');

  const matrixRows = participants.map(participant => {
    const row = { Participante: participant.name };
    matches.forEach(match => {
      const prediction = participant.predictions?.[match.id];
      row[`#${match.id} ${match.homeTeam} vs ${match.awayTeam}`] = prediction
        ? `${prediction.homeScore}-${prediction.awayScore}`
        : '';
    });
    return row;
  });
  appendJsonSheet(XLSX, workbook, matrixRows, 'Matriz');

  ranked.forEach(({ participant }) => {
    appendJsonSheet(XLSX, workbook, participantRows(participant, matches), uniqueSheetName(workbook, slug(participant.name) || participant.name));
  });

  await downloadWorkbook(XLSX, workbook, `quinielas-mundial26-completo.xlsx`);
}
