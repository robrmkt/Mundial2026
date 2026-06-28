import { getWindowStatus } from './predictionWindows';

export function isNewQuinielaMode(dashboardMode) {
  return dashboardMode === 'new_quiniela' || dashboardMode === 'combined';
}

export function getActivePredictionWindow(predictionWindows = []) {
  const viable = predictionWindows.filter(w =>
    ['open', 'scheduled', 'draft'].includes(getWindowStatus(w))
  );
  return viable.find(w => getWindowStatus(w) === 'open') || viable[0] || null;
}

export function getPhaseMatches({ matches = [], settings = {}, predictionWindows = [], dashboardMode }) {
  if (!isNewQuinielaMode(dashboardMode)) return matches;

  const activeWindow = getActivePredictionWindow(predictionWindows);
  const matchIds = activeWindow?.matchIds?.map(String).filter(Boolean) || [];

  const sortByKickoff = (arr) =>
    [...arr].sort((a, b) => {
      const ka = Date.parse(a.kickoff || a.utcDate || a.dateTime || '') || 9e15;
      const kb = Date.parse(b.kickoff || b.utcDate || b.dateTime || '') || 9e15;
      return ka - kb;
    });

  if (matchIds.length) {
    return sortByKickoff(matches.filter(m => matchIds.includes(String(m.id))));
  }

  const startAt = Date.parse(settings?.startAt || '');
  const byStartAt = matches.filter(m => {
    const kickoff = Date.parse(m.kickoff || m.utcDate || m.dateTime || '');
    return Number.isFinite(startAt) && Number.isFinite(kickoff) && kickoff >= startAt;
  });

  if (byStartAt.length) return sortByKickoff(byStartAt);

  return sortByKickoff(matches.filter(m => Number(m.id) >= 73));
}

export function getPredictionParticipants({ dashboardMode, participants = [], newQuinielaStandings = [] }) {
  if (isNewQuinielaMode(dashboardMode)) return newQuinielaStandings;
  return participants;
}

// Multi-key lookup: busca pronóstico por id local, feedId, espnId, externalId.
// Cubre mismatch entre el id del partido local y el que usó el feed externo al guardar.
export function getPredictionByMatch(player, match) {
  const predictions = player?.predictions || player?.continuationPredictions || {};
  const keys = [
    String(match.id ?? ''),
    String(match.feedId ?? ''),
    String(match.espnId ?? ''),
    String(match.externalId ?? '')
  ].filter(Boolean);

  for (const key of keys) {
    const v = predictions[key];
    if (v != null) return v;
  }
  return null;
}
