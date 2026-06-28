import { assignDenseRanksByPoints } from './ranking';
import { getPredictionByMatch } from './phaseContext';

function normalizeSubmissionPredictions(predictions) {
  const result = {};
  Object.entries(predictions || {}).forEach(([matchId, p]) => {
    result[matchId] = {
      homeScore: Number(p.homeScore ?? p.home ?? ''),
      awayScore: Number(p.awayScore ?? p.away ?? '')
    };
  });
  return result;
}

function computeScore(predictions, matches) {
  let points = 0, exactHits = 0, outcomeHits = 0, playedAndPredicted = 0;
  const playerObj = { predictions };

  matches.forEach(m => {
    if (m.status === 'SCHEDULED') return;
    // Multi-key lookup: cubre mismatch entre id local y el que guardó el feed
    const pred = getPredictionByMatch(playerObj, m);
    if (!pred) return;
    const pHome = parseInt(pred.homeScore, 10);
    const pAway = parseInt(pred.awayScore, 10);
    const mHome = parseInt(m.homeScore, 10);
    const mAway = parseInt(m.awayScore, 10);
    if ([pHome, pAway, mHome, mAway].some(Number.isNaN)) return;
    playedAndPredicted++;
    const exact = pHome === mHome && pAway === mAway;
    const outcome = Math.sign(pHome - pAway) === Math.sign(mHome - mAway);
    if (exact) { points += 3; exactHits++; }
    else if (outcome) { points += 1; outcomeHits++; }
  });

  const effectiveness = playedAndPredicted > 0
    ? Math.round(((exactHits + outcomeHits) / playedAndPredicted) * 100)
    : 0;
  return { points, exactHits, outcomeHits, playedAndPredicted, effectiveness };
}

export function buildContinuationStandings({ participants, phaseSubmissions, matches }) {
  // Incluir submissions aprobadas Y submissions editadas que conservan approvedPredictions.
  // Un usuario aprobado que edita su quiniela no desaparece de la tabla oficial.
  const officialSubmissions = (phaseSubmissions || []).filter(s =>
    s.status === 'approved' || (s.status === 'edited' && s.approvedPredictions && Object.keys(s.approvedPredictions).length > 0)
  );

  const byEmail = new Map();

  officialSubmissions.forEach(sub => {
    const email = String(sub.email || '').toLowerCase();
    if (!email) return;

    const base = (participants || []).find(p =>
      String(p.email || '').toLowerCase() === email ||
      String(p.name || '').trim().toLowerCase() === String(sub.participantName || '').trim().toLowerCase()
    );

    const existing = byEmail.get(email) || {
      name: sub.participantName || base?.name || email,
      email,
      avatar: base?.avatar || (sub.participantName || email).slice(0, 2).toUpperCase(),
      photo: base?.photo || '',
      team: sub.team || base?.team || '',
      predictions: {}
    };

    // Usar approvedPredictions si el status es 'edited' (versión oficial congelada)
    const sourcePredictions = sub.status === 'edited' && sub.approvedPredictions
      ? sub.approvedPredictions
      : sub.predictions;

    existing.predictions = {
      ...existing.predictions,
      ...normalizeSubmissionPredictions(sourcePredictions)
    };

    byEmail.set(email, existing);
  });

  const scored = Array.from(byEmail.values())
    .map(p => ({ ...p, ...computeScore(p.predictions, matches) }));
  return assignDenseRanksByPoints(scored);
}
