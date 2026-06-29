// ESPN IDs for each round (based on 2026 WC bracket)
const ESPN_R32  = new Set(['760486','760487','760488','760489','760490','760491','760492','760493','760494','760495','760496','760497','760498','760499','760500','760501']);
const ESPN_R16  = new Set(['760502','760503','760504','760505','760506','760507','760508','760509']);
const ESPN_QF   = new Set(['760510','760511','760512','760513']);
const ESPN_SF   = new Set(['760514','760515']);
const ESPN_FINAL = new Set(['760516','760517']);

export function getMatchRound(match) {
  // 1. Check explicit round field (from our matches.json or ESPN round info)
  const raw = String(match.round || match.stage || match.phase || '').toLowerCase();
  if (raw === 'r32' || raw.includes('round of 32') || raw.includes('dieciseis')) return 'r32';
  if (raw === 'r16' || raw.includes('round of 16') || raw.includes('octav')) return 'r16';
  if (raw === 'qf' || raw.includes('quarter')) return 'qf';
  if (raw === 'sf' || raw.includes('semi')) return 'sf';
  if (raw === 'final' || (raw.includes('final') && !raw.includes('semi'))) return 'final';

  // 2. Check integer ID range (local matches.json)
  const id = Number(match.id);
  if (Number.isFinite(id)) {
    if (id >= 73 && id <= 88)   return 'r32';
    if (id >= 89 && id <= 96)   return 'r16';
    if (id >= 97 && id <= 100)  return 'qf';
    if (id >= 101 && id <= 102) return 'sf';
    if (id >= 103 && id <= 104) return 'final';
  }

  // 3. Check espnId set (for ESPN-sourced matches with string IDs)
  const eid = String(match.espnId || '');
  if (eid && ESPN_R32.has(eid))   return 'r32';
  if (eid && ESPN_R16.has(eid))   return 'r16';
  if (eid && ESPN_QF.has(eid))    return 'qf';
  if (eid && ESPN_SF.has(eid))    return 'sf';
  if (eid && ESPN_FINAL.has(eid)) return 'final';

  // 4. Fallback by kickoff date range (2026 WC schedule)
  const kickoff = Date.parse(match.kickoff || match.utcDate || match.dateTime || '');
  if (Number.isFinite(kickoff)) {
    const d = new Date(kickoff);
    const ymd = d.toISOString().slice(0, 10);
    if (ymd >= '2026-06-28' && ymd <= '2026-07-04') return 'r32';
    if (ymd >= '2026-07-04' && ymd <= '2026-07-08') return 'r16';
    if (ymd >= '2026-07-09' && ymd <= '2026-07-12') return 'qf';
    if (ymd >= '2026-07-13' && ymd <= '2026-07-16') return 'sf';
    if (ymd >= '2026-07-17' && ymd <= '2026-07-19') return 'final';
  }

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
