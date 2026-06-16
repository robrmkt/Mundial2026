// Adaptador de cronología (V4). El feed de ESPN no siempre trae los eventos en
// la misma rama, así que leemos de varias fuentes posibles y normalizamos a un
// formato estable con TIPOS SEMÁNTICOS (no emojis) + dedupeKey.

// Tipo semántico -> emoji de respaldo (mientras EventIcon (Fase 4) no exista,
// la UI sigue mostrando este emoji). La lógica NUNCA usa el emoji, usa el tipo.
const TYPE_EMOJI = {
  goal: '⚽',
  mexico_goal: '🇲🇽',
  yellow_card: '🟨',
  red_card: '🟥',
  penalty: '🎯',
  penalty_missed: '❌',
  var: '📺',
  substitution: '🔁',
  halftime: '⏸',
  fulltime: '🏁',
  kickoff: '🟢',
  generic: '•'
};

// Etiqueta legible por tipo (para mostrar en la UI sin exponer la clave).
const TYPE_LABEL = {
  goal: 'Gol',
  mexico_goal: 'Gol de México',
  yellow_card: 'Tarjeta amarilla',
  red_card: 'Tarjeta roja',
  penalty: 'Penal',
  penalty_missed: 'Penal fallado',
  var: 'Revisión de VAR',
  substitution: 'Cambio',
  halftime: 'Medio tiempo',
  fulltime: 'Final',
  kickoff: 'Inicio',
  generic: ''
};

const MAJOR_TYPES = new Set(['goal', 'mexico_goal', 'red_card', 'penalty', 'penalty_missed']);

function normalizeTeam(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Clasifica el tipo semántico a partir del texto/tipo crudo del evento.
function classifyType(rawText, teamName, isMexico) {
  const t = String(rawText || '').toLowerCase();
  if (/penal.*(fall|err|atajad|desviad)|(miss|saved|fail).*penalt|penalti.*(fall|err)/.test(t)) return 'penalty_missed';
  if (/penal/.test(t) && !/gol|goal|anot/.test(t)) return 'penalty';
  if (/\bgol\b|goal|anotaci[oó]n|marca el|score/.test(t)) return isMexico ? 'mexico_goal' : 'goal';
  if (/amarilla|yellow/.test(t)) return 'yellow_card';
  if (/roja|red card|expuls/.test(t)) return 'red_card';
  if (/\bvar\b|revisi[oó]n de jugada|video review/.test(t)) return 'var';
  if (/cambio|sustituc|substitution/.test(t)) return 'substitution';
  if (/medio tiempo|descanso|half.?time/.test(t)) return 'halftime';
  if (/tiempo completo|final del|full.?time|partido finalizado/.test(t)) return 'fulltime';
  if (/saque inicial|kick.?off|inicia el/.test(t)) return 'kickoff';
  return 'generic';
}

function minuteToNumber(display) {
  const n = Number.parseInt(String(display ?? ''), 10);
  return Number.isNaN(n) ? null : n;
}

// Recolecta crudos de cualquier rama del summary donde ESPN suele ponerlos.
function gatherRaw(data) {
  const branches = [
    data?.keyEvents,
    data?.header?.competitions?.[0]?.details,
    data?.competitions?.[0]?.details,
    data?.plays,
    data?.commentary,
    data?.events
  ];
  const out = [];
  branches.forEach(branch => {
    if (Array.isArray(branch)) out.push(...branch);
  });
  return out;
}

// Extrae los campos sin importar la forma exacta del crudo.
function readRaw(raw) {
  const typeText = raw?.type?.text || raw?.type?.name || raw?.text || '';
  const minute = raw?.clock?.displayValue || raw?.time?.displayValue || raw?.timeStamp || '';
  const team = raw?.team?.displayName || raw?.team?.name || raw?.team?.abbreviation || '';
  const athlete =
    raw?.athletesInvolved?.[0]?.displayName ||
    raw?.participants?.[0]?.athlete?.displayName ||
    raw?.scorer?.displayName ||
    '';
  const text = raw?.text || raw?.shortText || typeText || '';
  const scoreValue = (raw?.homeScore != null && raw?.awayScore != null)
    ? `${raw.homeScore}-${raw.awayScore}`
    : (raw?.scoreValue || '');
  return { typeText, minute, team, athlete, text, scoreValue, id: raw?.id };
}

// Construye la cronología normalizada, deduplicada y ordenada (reciente primero).
export function buildTimeline(data, { espnId = '', mexicoNames = ['mexico'] } = {}) {
  const mexicoSet = new Set(mexicoNames.map(normalizeTeam));
  const seen = new Set();
  const events = [];

  gatherRaw(data).forEach(raw => {
    const r = readRaw(raw);
    if (!r.text && !r.typeText) return;

    const teamNorm = normalizeTeam(r.team);
    const isMexico = mexicoSet.has(teamNorm);
    const type = classifyType(`${r.typeText} ${r.text}`, r.team, isMexico);
    const minuteNumber = minuteToNumber(r.minute);

    const dedupeKey = [
      type,
      espnId,
      teamNorm,
      minuteNumber ?? r.minute ?? '',
      r.scoreValue || r.text.slice(0, 24)
    ].join('|');

    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    events.push({
      id: r.id || dedupeKey,
      espnId,
      minute: r.minute || (minuteNumber != null ? `${minuteNumber}'` : ''),
      minuteNumber,
      type,
      label: TYPE_LABEL[type] || r.typeText,
      iconKey: type,
      icon: TYPE_EMOJI[type] || TYPE_EMOJI.generic, // respaldo visual
      text: r.text || r.typeText,
      team: r.team || '',
      player: r.athlete || '',
      isMajor: MAJOR_TYPES.has(type),
      isGoal: type === 'goal' || type === 'mexico_goal',
      rawType: r.typeText
    });
  });

  // Orden cronológico ascendente para razonar, luego invertimos: reciente primero.
  events.sort((a, b) => (a.minuteNumber ?? 0) - (b.minuteNumber ?? 0));
  return events.reverse();
}

export { TYPE_EMOJI };
