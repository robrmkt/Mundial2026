// Roles divertidos del apostador, derivados de sus estadísticas reales.
// Cambian solos conforme avanzan los partidos (y se resalta su día con un "flair").

const ROLES = {
  capitan: { title: 'El Capitán', emoji: '🐐', tagline: 'Manda en la quiniela. Puro instinto goleador.', accent: 'gold' },
  francotirador: { title: 'Francotirador', emoji: '🎯', tagline: 'Clava marcadores exactos como nadie.', accent: 'green' },
  portero: { title: 'Portero imbatible', emoji: '🧤', tagline: 'Casi no falla: muralla defensiva.', accent: 'blue' },
  goleador: { title: 'Goleador', emoji: '⚽', tagline: 'En zona de ataque, sumando seguido.', accent: 'green' },
  mediocampo: { title: 'Motor del medio', emoji: '🏃', tagline: 'Corre cada balón y pelea cada punto.', accent: 'gray' },
  banca: { title: 'En la banca', emoji: '🪑', tagline: '¡Pero no desesperes, esto apenas arranca!', accent: 'red' },
  calentando: { title: 'Calentando', emoji: '🔁', tagline: 'Aún sin partidos jugados. Listo para saltar.', accent: 'gray' }
};

// Día calendario LOCAL del espectador (para que el "flair de hoy" coincida con su percepción).
function localDateKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resultKind(pred, match) {
  if (!pred) return null;
  const pHome = Number(pred.homeScore);
  const pAway = Number(pred.awayScore);
  const mHome = Number(match.homeScore);
  const mAway = Number(match.awayScore);
  if ([pHome, pAway, mHome, mAway].some(Number.isNaN)) return null;
  if (pHome === mHome && pAway === mAway) return 'exact';
  if (Math.sign(pHome - pAway) === Math.sign(mHome - mAway)) return 'outcome';
  return 'miss';
}

export function getPlayerProfile(player, matches, totalParticipants, todayKey) {
  const {
    rank = 0,
    points = 0,
    exactHits = 0,
    effectiveness = 0,
    playedAndPredicted = 0
  } = player;
  // `|| {}` cubre también predictions === null (un default de desestructuración no lo haría)
  const predictions = player.predictions || {};

  const finished = matches.filter(m => m.status === 'FINISHED');
  const results = finished
    .map(m => {
      const pred = predictions[m.id];
      const kind = resultKind(pred, m);
      if (!kind) return null;
      return {
        matchId: m.id,
        kind,
        actual: `${m.homeScore}-${m.awayScore}`,
        pred: `${pred.homeScore}-${pred.awayScore}`,
        home: m.homeTeam,
        away: m.awayTeam,
        homeFlag: m.homeFlag,
        awayFlag: m.awayFlag,
        kickoff: m.kickoff || ''
      };
    })
    .filter(Boolean);

  const recent = results.slice(-7);
  const misses = results.filter(r => r.kind === 'miss').length;

  const todayResults = todayKey ? results.filter(r => localDateKey(r.kickoff) === todayKey) : [];
  const todayExact = todayResults.filter(r => r.kind === 'exact').length;
  const todayMiss = todayResults.filter(r => r.kind === 'miss').length;
  const todayPoints = todayResults.reduce((acc, r) => acc + (r.kind === 'exact' ? 3 : r.kind === 'outcome' ? 1 : 0), 0);

  const topHalf = totalParticipants ? rank <= Math.ceil(totalParticipants / 2) : false;

  let role;
  if (playedAndPredicted === 0) role = ROLES.calentando;
  else if (rank === 1 && points > 0) role = ROLES.capitan;
  else if (exactHits >= 3) role = ROLES.francotirador;
  else if (effectiveness >= 60 && playedAndPredicted >= 2) role = ROLES.portero;
  else if (effectiveness <= 25 && playedAndPredicted >= 3) role = ROLES.banca;
  else if (points > 0 && (topHalf || exactHits >= 1)) role = ROLES.goleador;
  else role = ROLES.mediocampo;

  let flair = null;
  if (todayExact >= 1) flair = { text: `🔥 ¡${todayExact} exacto${todayExact > 1 ? 's' : ''} hoy!`, tone: 'hot' };
  else if (todayPoints > 0) flair = { text: `📈 +${todayPoints} pts hoy`, tone: 'up' };
  else if (todayMiss >= 2) flair = { text: `🥶 Día frío · ${todayMiss} fallos`, tone: 'cold' };

  return {
    role,
    recent,
    misses,
    today: { exact: todayExact, miss: todayMiss, points: todayPoints, flair }
  };
}
