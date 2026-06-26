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

  matches.forEach(m => {
    if (m.status === 'SCHEDULED') return;
    const pred = predictions[String(m.id)];
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
  const approved = (phaseSubmissions || []).filter(s => s.status === 'approved');
  const byEmail = new Map();

  approved.forEach(sub => {
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

    existing.predictions = {
      ...existing.predictions,
      ...normalizeSubmissionPredictions(sub.predictions)
    };

    byEmail.set(email, existing);
  });

  return Array.from(byEmail.values())
    .map(p => ({ ...p, ...computeScore(p.predictions, matches) }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      return b.effectiveness - a.effectiveness;
    })
    .map((p, idx) => ({ ...p, rank: idx + 1 }));
}
