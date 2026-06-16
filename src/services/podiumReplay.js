// Cálculo RETROACTIVO del Modo Leyenda y el movimiento de ranking,
// derivado de los resultados reales del torneo (no de ticks en vivo).
//
// Idea: cada vez que termina un partido cambian los puntos y, por tanto, el podio.
// Reproducimos los partidos terminados en orden cronológico; entre el fin de un
// partido y el del siguiente, el top-3 permanece fijo y acumula ese tiempo real.
// El que más tiempo acumula desde el inicio del Mundial es la Leyenda.

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // ~fin del partido = inicio + 2h

function scoreParticipant(predictions, playedMatches) {
  let points = 0;
  let exactHits = 0;
  let outcomeHits = 0;
  let played = 0;
  const preds = predictions || {};
  playedMatches.forEach(m => {
    const pred = preds[m.id];
    if (!pred) return;
    const pHome = parseInt(pred.homeScore, 10);
    const pAway = parseInt(pred.awayScore, 10);
    const mHome = parseInt(m.homeScore, 10);
    const mAway = parseInt(m.awayScore, 10);
    if ([pHome, pAway, mHome, mAway].some(Number.isNaN)) return;
    played++;
    if (pHome === mHome && pAway === mAway) { points += 3; exactHits++; }
    else if (Math.sign(pHome - pAway) === Math.sign(mHome - mAway)) { points += 1; outcomeHits++; }
  });
  const effectiveness = played > 0 ? Math.round(((exactHits + outcomeHits) / played) * 100) : 0;
  return { points, exactHits, outcomeHits, effectiveness, played };
}

// Mismo orden que la tabla general: puntos, luego exactos, luego efectividad.
function rankParticipants(participants, playedMatches) {
  return participants
    .map(p => ({ name: p.name, ...scoreParticipant(p.predictions, playedMatches) }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      return b.effectiveness - a.effectiveness;
    })
    .map((p, idx) => ({ ...p, rank: idx + 1 }));
}

// liveTop3 = nombres del top-3 ACTUAL en pantalla (incluye el partido en vivo).
// Se usa para el tramo abierto (último partido terminado → ahora), de modo que
// quien está en el podio que se VE acumule tiempo, aunque su posición dependa de
// un partido en curso. Los tramos históricos sí usan el ranking de solo terminados.
export function computePodiumAndMovement(matches = [], participants = [], nowTs = 0, liveTop3 = null) {
  const empty = { podiumMs: {}, legend: null, movement: {} };
  if (!Array.isArray(participants) || participants.length === 0) return empty;

  const finished = matches
    .filter(m => m.status === 'FINISHED' && m.kickoff)
    .map(m => ({ ...m, _end: new Date(m.kickoff).getTime() + MATCH_DURATION_MS }))
    .filter(m => Number.isFinite(m._end))
    .sort((a, b) => a._end - b._end);

  const podiumMs = {};

  // Acumula tiempo en el podio segmento por segmento (tiempos acotados a "ahora").
  for (let i = 0; i < finished.length; i++) {
    const isLast = i === finished.length - 1;
    let top3names;
    if (isLast && Array.isArray(liveTop3) && liveTop3.length > 0) {
      // Tramo abierto: usa el podio que se ve en pantalla (en vivo).
      top3names = liveTop3.slice(0, 3);
    } else {
      const ranked = rankParticipants(participants, finished.slice(0, i + 1));
      top3names = ranked.slice(0, 3).filter(p => p.points > 0).map(p => p.name); // 0 pts no "pisa" el podio
    }
    const segStart = Math.min(finished[i]._end, nowTs);
    const segEnd = isLast ? nowTs : Math.min(finished[i + 1]._end, nowTs);
    const dur = Math.max(0, segEnd - segStart);
    if (dur > 0) top3names.forEach(n => { podiumMs[n] = (podiumMs[n] || 0) + dur; });
  }

  // Leyenda = mayor tiempo acumulado.
  let legend = null;
  Object.entries(podiumMs).forEach(([name, ms]) => {
    if (ms > 0 && (!legend || ms > legend.totalMs)) legend = { name, totalMs: ms };
  });

  // Movimiento = ranking actual (con todos los terminados) vs antes del último partido.
  const movement = {};
  if (finished.length > 0) {
    const current = rankParticipants(participants, finished);
    const prev = rankParticipants(participants, finished.slice(0, finished.length - 1));
    const prevRank = {};
    prev.forEach(p => { prevRank[p.name] = p.rank; });
    current.forEach(p => {
      const pr = prevRank[p.name];
      movement[p.name] = (pr != null) ? (pr - p.rank) : 0;
    });
  }

  return { podiumMs, legend, movement };
}
