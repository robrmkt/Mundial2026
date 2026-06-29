export function getMatchRound(match) {
  const raw = String(match.round || match.stage || match.phase || '').toLowerCase();

  if (raw.includes('round of 32') || raw.includes('dieciseis') || raw.includes('32')) return 'r32';
  if (raw.includes('round of 16') || raw.includes('octav') || raw.includes('16')) return 'r16';
  if (raw.includes('quarter')) return 'qf';
  if (raw.includes('semi')) return 'sf';
  if (raw.includes('final')) return 'final';

  const id = Number(match.id);
  if (id >= 73 && id <= 88)   return 'r32';
  if (id >= 89 && id <= 96)   return 'r16';
  if (id >= 97 && id <= 100)  return 'qf';
  if (id >= 101 && id <= 102) return 'sf';
  if (id >= 103 && id <= 104) return 'final';

  return 'unknown';
}

export const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'final', 'unknown'];

export const ROUND_LABELS = {
  r32:     'Dieciseisavos',
  r16:     'Octavos',
  qf:      'Cuartos de final',
  sf:      'Semifinales',
  final:   'Final',
  unknown: 'Otros'
};

export function groupMatchesByRound(matches = []) {
  return matches.reduce((acc, match) => {
    const round = getMatchRound(match);
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});
}

// Returns the earliest round that has at least one open (confirmed + not locked) match.
export function getActiveRound(matches = [], isMatchConfirmedFn, isMatchLockedFn) {
  for (const round of ROUND_ORDER) {
    const roundMatches = matches.filter(m => getMatchRound(m) === round);
    if (roundMatches.some(m => isMatchConfirmedFn(m) && !isMatchLockedFn(m))) return round;
  }
  // Fall back to the earliest round that has confirmed matches at all
  for (const round of ROUND_ORDER) {
    if (matches.some(m => getMatchRound(m) === round && isMatchConfirmedFn(m))) return round;
  }
  return ROUND_ORDER[0];
}
