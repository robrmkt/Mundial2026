// Perfil del apostador (V4): rol/apodo dinámico de un catálogo amplio (120+),
// que cambia según su estado real en la tabla. Reemplaza al sistema viejo de 7
// roles. La lógica usa estados semánticos; el apodo concreto se elige estable
// por nombre para que cada quien tenga el suyo y no se sienta repetitivo.

// Cada categoría = un estado del jugador. accent/emoji alimentan la ficha cromo.
export const ROLE_CATEGORIES = {
  warming: {
    accent: 'gray', emoji: '🔁',
    tagline: 'Aún sin partidos jugados. Listo para saltar a la cancha.',
    titles: [
      'Calentando en la banda', 'El que está afinando la puntería',
      'El que aún no debuta', 'El que espera el silbatazo',
      'El que llega con todo por estrenar', 'El que trae la quiniela en pausa'
    ]
  },
  leader: {
    accent: 'gold', emoji: '👑',
    tagline: 'Manda en la tabla. Todos lo persiguen.',
    titles: [
      'El que trae la 10', 'El dueño del balón', 'El que manda en la cancha',
      'El jefe de la tabla', 'El que está jugando otro torneo', 'El de la silla grande',
      'El que no pidió permiso', 'El mandón del marcador', 'El que salió carta dorada',
      'El que trae la corona prestada', 'El que todos quieren alcanzar', 'El que despertó líder',
      'El que está arriba y lo sabe', 'El que trae la tabla en modo fácil', 'El que se sentó en el trono',
      'El patrón del marcador', 'El que amaneció insoportable', 'El que trae el gafete de líder',
      'El que no suelta la cima', 'El que ya se creyó favorito'
    ]
  },
  legend: {
    accent: 'gold', emoji: '🏛️',
    tagline: 'El que más tiempo ha aguantado arriba. Puro kilometraje en el podio.',
    titles: [
      'Modo Leyenda', 'El que hizo base en el podio', 'El histórico de la tabla',
      'El que más aguantó arriba', 'El que dejó huella en el podio', 'El que vivió entre medallas',
      'El que no siempre lidera, pero pesa', 'El que tiene renta acumulada', 'El que no se va del recuerdo',
      'El veterano del top 3'
    ]
  },
  podium: {
    accent: 'green', emoji: '🥉',
    tagline: 'En zona de medallas, oliendo el trofeo.',
    titles: [
      'Zona de medallas', 'El que tocó metal', 'El que vive arriba',
      'El invitado incómodo del podio', 'El que ya no quiere bajar', 'El que rentó lugar en el podio',
      'El que está oliendo trofeo', 'El que se coló a la foto', 'El que está haciendo sombra al líder',
      'El tercero que asusta', 'El que se metió a la premiación', 'El que ya pidió foto oficial',
      'El que está a nada del trono', 'El que trae medalla provisional', 'El que está subiendo la presión'
    ]
  },
  comeback: {
    accent: 'green', emoji: '📈',
    tagline: 'Venía callado y agarró vuelo. Remontada en marcha.',
    titles: [
      'El que viene subiendo', 'El que agarró vuelo', 'El que se metió por la banda',
      'El que despertó tarde pero fuerte', 'El que trae remontada de película', 'El que venía callado',
      'El que ya prendió motores', 'El que salió del fondo', 'El que hizo cambio táctico',
      'El que volvió del vestidor', 'El que empezó a meter miedo', 'El que ya encontró portería',
      'El que cambió el guion', 'El que no estaba muerto', 'El que viene con música de épica'
    ]
  },
  exact: {
    accent: 'green', emoji: '🎯',
    tagline: 'Clava marcadores exactos como si tuviera el guion.',
    titles: [
      'El brujo del marcador', 'El que vio el futuro', 'El de la bola de cristal',
      'El que trae puntería fina', 'El que clavó el resultado', 'El VAR humano',
      'El que no adivina, calcula', 'El que trae Excel en la cabeza', 'El que le susurra al balón',
      'El que le atinó sin despeinarse', 'El del marcador quirúrgico', 'El que juega con ventaja emocional',
      'El que vino con spoiler', 'El que leyó el guion del partido', 'El que trae antena mundialista'
    ]
  },
  hot: {
    accent: 'red', emoji: '🔥',
    tagline: 'Viene encendido. No falla ni queriendo.',
    titles: [
      'El que viene encendido', 'El de la racha peligrosa', 'El que trae fuego en los pronósticos',
      'El que está insoportable', 'El que ya agarró ritmo', 'El que trae modo goleada',
      'El que no falla ni queriendo', 'El que está cobrando puntos', 'El que huele sangre en la tabla',
      'El que se puso serio', 'El que viene enrachado', 'El que prendió motores',
      'El que anda fino', 'El que trae los pronósticos benditos', 'El que está en modo campeón'
    ]
  },
  slump: {
    accent: 'gray', emoji: '🥶',
    tagline: 'Jornada fría. Necesita una limpia y un trébol.',
    titles: [
      'El que se resbaló', 'El que perdió marca', 'El que bajó a revisar la tabla',
      'El que necesita VAR', 'El que tuvo jornada fría', 'El que se quedó pensando',
      'El que pidió tiempo fuera', 'El que está en pausa táctica', 'El que necesita trébol',
      'El que dejó puntos en la cancha', 'El que perdió el balón en salida', 'El que está revisando sus fuentes',
      'El que tuvo partido para el olvido', 'El que necesita vestidor', 'El que pide reinicio emocional'
    ]
  },
  mid: {
    accent: 'blue', emoji: '⚽',
    tagline: 'Sin reflectores, pero ahí sigue, sumando y acechando.',
    titles: [
      'El que todavía está en la pelea', 'El de zona tranquila', 'El que va de puntito en puntito',
      'El que no hace ruido pero suma', 'El que está esperando su momento', 'El que está jugando al largo plazo',
      'El que viene sin reflectores', 'El que puede despertar', 'El que está a un exacto de meterse',
      'El que no está muerto, anda midiendo', 'El que está cocinando la remontada', 'El que trae perfil bajo',
      'El que sigue respirando en la tabla', 'El que está a nada de hacer ruido', 'El que no presume, pero acecha'
    ]
  },
  outTop: {
    accent: 'gray', emoji: '🪑',
    tagline: 'En la banca, pero con fe y actitud.',
    titles: [
      'Banca con esperanza', 'El que está calentando', 'El que todavía cree',
      'El que pide cambio', 'El suplente de lujo', 'El que viene para el segundo tiempo',
      'El que está guardando puntos', 'El que necesita un gol milagroso', 'El que vive de la fe',
      'El que mira la tabla desde abajo, pero con actitud', 'El que trae chamarra de suplente',
      'El que espera señal del técnico', 'El que está haciendo banca premium', 'El que aún no firma la derrota',
      'El que necesita que el balón coopere'
    ]
  },
  bottom: {
    accent: 'red', emoji: '🧊',
    tagline: 'Desde el sótano, dándole drama al torneo. La épica empieza abajo.',
    titles: [
      'El de las aguas', 'El que fue por las aguas', 'El que trae la hielera',
      'El que está cuidando la banca', 'El que sostiene la esperanza', 'El que va por la remontada épica',
      'El que está en modo historia de superación', 'El que todavía puede decir "apenas empieza"',
      'El que le está dando drama al torneo', 'El que necesita que México lo salve',
      'El que está agarrando vuelo desde abajo', 'El que empezó en modo difícil', 'El que trae la épica pendiente',
      'El que está en tutorial', 'El que viene desde el sótano con fe'
    ]
  }
};

// Día calendario LOCAL (para que el "flair de hoy" coincida con la percepción del usuario).
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

// Hash estable de un string -> entero no negativo (para elegir apodo sin azar).
function stableIndex(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Racha desde el final de la lista de resultados cronológicos.
// hot = aciertos seguidos (exact u outcome); cold = fallos seguidos.
function computeStreaks(resultsChrono) {
  let hot = 0;
  let cold = 0;
  for (let i = resultsChrono.length - 1; i >= 0; i--) {
    const k = resultsChrono[i].kind;
    if (k === 'exact' || k === 'outcome') { if (cold > 0) break; hot++; }
    else if (k === 'miss') { if (hot > 0) break; cold++; }
  }
  return { hot, cold };
}

// Decide la categoría de rol según el estado real del jugador.
// `ctx`: { totalParticipants, rankDelta, isLegend } — todos opcionales.
function pickCategory(player, streaks, ctx) {
  const played = player.playedAndPredicted || 0;
  if (played === 0) return 'warming';

  const total = ctx.totalParticipants || 0;
  const rank = player.rank || 0;
  const delta = ctx.rankDelta || 0; // + subió, - bajó
  const points = player.points || 0;
  const exactHits = player.exactHits || 0;

  if (rank === 1 && points > 0) return 'leader';
  if (ctx.isLegend) return 'legend';
  if (rank >= 2 && rank <= 3) return 'podium';
  if (delta >= 4) return 'comeback';
  if (exactHits >= 2) return 'exact';
  if (streaks.hot >= 3) return 'hot';
  if (streaks.cold >= 3 || delta <= -4) return 'slump';

  // Fallbacks posicionales
  if (total && rank > Math.max(total - 3, 12)) return 'bottom';
  if (rank > 12) return 'outTop';
  return 'mid';
}

// Selecciona el rol concreto (categoría + apodo estable por nombre).
export function selectRole(player, resultsChrono, ctx = {}) {
  const streaks = computeStreaks(resultsChrono);
  const key = pickCategory(player, streaks, ctx);
  const category = ROLE_CATEGORIES[key] || ROLE_CATEGORIES.mid;
  const idx = stableIndex(player.name) % category.titles.length;
  return {
    key,
    title: category.titles[idx],
    emoji: category.emoji,
    tagline: category.tagline,
    accent: category.accent,
    streaks
  };
}

// Perfil completo: superset de la versión vieja (role/recent/misses/today)
// + streaks. `ctx` permite inyectar movimiento de ranking y Modo Leyenda.
export function getPlayerProfile(player, matches, totalParticipants, todayKey, ctx = {}) {
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

  const role = selectRole(player, results, { totalParticipants, ...ctx });

  let flair = null;
  if (todayExact >= 1) flair = { text: `🔥 ¡${todayExact} exacto${todayExact > 1 ? 's' : ''} hoy!`, tone: 'hot' };
  else if (todayPoints > 0) flair = { text: `📈 +${todayPoints} pts hoy`, tone: 'up' };
  else if (todayMiss >= 2) flair = { text: `🥶 Día frío · ${todayMiss} fallos`, tone: 'cold' };

  return {
    role,
    recent,
    misses,
    results,
    streaks: role.streaks,
    today: { exact: todayExact, miss: todayMiss, points: todayPoints, flair }
  };
}
