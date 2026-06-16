// Datos en vivo del Mundial 2026 vía la API pública de ESPN (sin API key).
// Scoreboard: marcadores y estados de los 72 partidos de fase de grupos.
// Summary: cronología (goles, tarjetas, cambios) y estadísticas por partido.

import { buildTimeline } from './timelineAdapter';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const RANGE = '20260611-20260627';
const LANG = 'lang=es&region=mx';

// ESPN usa algunos nombres distintos a los de matches.json
const TEAM_ALIASES = {
  'chequia': 'republica checa',
  'qatar': 'catar',
  'curacao': 'curazao',
  'republica democratica del congo': 'rd congo'
};

function normalizeTeam(name) {
  const plain = String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return TEAM_ALIASES[plain] || plain;
}

function parseMinute(displayClock) {
  const value = Number.parseInt(String(displayClock ?? ''), 10);
  return Number.isNaN(value) ? 0 : value;
}

function mapState(statusType) {
  if (statusType?.state === 'in') return 'LIVE';
  if (statusType?.state === 'post') return 'FINISHED';
  return 'SCHEDULED';
}

export async function fetchScoreboard() {
  const res = await fetch(`${BASE}/scoreboard?dates=${RANGE}&${LANG}`);
  if (!res.ok) throw new Error(`ESPN scoreboard ${res.status}`);
  const data = await res.json();

  return (data.events || []).map(event => {
    const comp = event.competitions?.[0];
    if (!comp) return null;
    const home = comp.competitors?.find(c => c.homeAway === 'home');
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    if (!home || !away) return null;

    const statusType = comp.status?.type;
    return {
      espnId: event.id,
      kickoff: comp.date || event.date,
      homeNorm: normalizeTeam(home.team?.displayName),
      awayNorm: normalizeTeam(away.team?.displayName),
      homeScore: Number.parseInt(home.score ?? '0', 10) || 0,
      awayScore: Number.parseInt(away.score ?? '0', 10) || 0,
      homeLogo: home.team?.logo || '',
      awayLogo: away.team?.logo || '',
      status: mapState(statusType),
      statusDetail: statusType?.detail || '',
      isHalftime: statusType?.name === 'STATUS_HALFTIME',
      displayClock: comp.status?.displayClock || '',
      minute: parseMinute(comp.status?.displayClock),
      venue: comp.venue?.fullName || '',
      city: comp.venue?.address?.city || ''
    };
  }).filter(Boolean);
}

// Combina los eventos de ESPN con la lista local de partidos (por par de equipos,
// único en fase de grupos). Devuelve la lista actualizada y los goles detectados.
export function mergeScoreboard(matches, espnEvents) {
  const byPair = new Map();
  espnEvents.forEach(ev => {
    byPair.set(`${ev.homeNorm}|${ev.awayNorm}`, ev);
  });

  const goals = [];
  const finished = [];
  let changed = false;

  const merged = matches.map(match => {
    const homeNorm = normalizeTeam(match.homeTeam);
    const awayNorm = normalizeTeam(match.awayTeam);
    const ev = byPair.get(`${homeNorm}|${awayNorm}`) || byPair.get(`${awayNorm}|${homeNorm}`);
    if (!ev) return match;

    const swapped = ev.homeNorm !== homeNorm;
    const newHome = swapped ? ev.awayScore : ev.homeScore;
    const newAway = swapped ? ev.homeScore : ev.awayScore;

    if (ev.status !== 'SCHEDULED') {
      if (newHome > (match.homeScore ?? 0) && match.status !== 'SCHEDULED') {
        goals.push({ matchId: match.id, team: match.homeTeam, flag: match.homeFlag, score: `${newHome} - ${newAway}`, rival: match.awayTeam, minute: ev.displayClock });
      }
      if (newAway > (match.awayScore ?? 0) && match.status !== 'SCHEDULED') {
        goals.push({ matchId: match.id, team: match.awayTeam, flag: match.awayFlag, score: `${newHome} - ${newAway}`, rival: match.homeTeam, minute: ev.displayClock });
      }
    }

    // Solo cuenta como "recién terminado" si lo vimos en vivo (no al cargar partidos viejos)
    if (ev.status === 'FINISHED' && match.status === 'LIVE') {
      finished.push({
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeFlag: match.homeFlag,
        awayFlag: match.awayFlag,
        homeScore: newHome,
        awayScore: newAway
      });
    }

    const next = {
      ...match,
      espnId: ev.espnId,
      kickoff: ev.kickoff,
      homeLogo: swapped ? ev.awayLogo : ev.homeLogo,
      awayLogo: swapped ? ev.homeLogo : ev.awayLogo,
      homeScore: ev.status === 'SCHEDULED' ? 0 : newHome,
      awayScore: ev.status === 'SCHEDULED' ? 0 : newAway,
      status: ev.status,
      statusDetail: ev.statusDetail,
      isHalftime: ev.isHalftime,
      displayClock: ev.displayClock,
      minute: ev.minute,
      venue: ev.venue,
      city: ev.city
    };

    if (JSON.stringify(next) !== JSON.stringify(match)) changed = true;
    return next;
  });

  return { merged, goals, finished, changed };
}

const STAT_LABELS = [
  { key: 'possessionPct', label: 'Posesión', suffix: '%' },
  { key: 'totalShots', label: 'Tiros totales' },
  { key: 'shotsOnTarget', label: 'Tiros a puerta' },
  { key: 'wonCorners', label: 'Tiros de esquina' },
  { key: 'foulsCommitted', label: 'Faltas' },
  { key: 'offsides', label: 'Fueras de lugar' },
  { key: 'totalPasses', label: 'Pases' }
];

// Detalle de un partido (cronología + estadísticas) para el Match Center.
export async function fetchMatchSummary(espnId) {
  const res = await fetch(`${BASE}/summary?event=${espnId}&${LANG}`);
  if (!res.ok) throw new Error(`ESPN summary ${res.status}`);
  const data = await res.json();

  // El adapter lee de varias ramas del feed (keyEvents, details, plays, …) y
  // normaliza con tipos semánticos + dedupe; ya viene reciente primero.
  const timeline = buildTimeline(data, { espnId, mexicoNames: ['México', 'Mexico'] });

  const teams = (data.boxscore?.teams || []).map(t => {
    const stats = Object.fromEntries((t.statistics || []).map(s => [s.name, s.displayValue]));
    return {
      name: t.team?.displayName || '',
      logo: t.team?.logo || '',
      stats: STAT_LABELS
        .filter(({ key }) => stats[key] !== undefined)
        .map(({ key, label, suffix }) => ({ key, label, value: `${stats[key]}${suffix || ''}` }))
    };
  });

  const header = data.header?.competitions?.[0];
  return {
    timeline,
    teams,
    attendance: data.gameInfo?.attendance || null,
    venue: data.gameInfo?.venue?.fullName || '',
    city: data.gameInfo?.venue?.address?.city || '',
    statusDetail: header?.status?.type?.detail || '',
    fetchedAt: new Date().toISOString()
  };
}
