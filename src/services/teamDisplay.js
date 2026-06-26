export function isPlaceholderTeam(name) {
  const value = String(name || '').toLowerCase();
  return (
    !value ||
    value.includes('tbd') ||
    value.includes('to be determined') ||
    value.includes('por definir') ||
    value.includes('third place') ||
    value.includes('winner group') ||
    value.includes('runner-up group') ||
    value.includes('winner of') ||
    value.includes('loser of')
  );
}

export function displayTeamName(name) {
  const raw = String(name || '').trim();
  if (!raw) return 'Por definir';
  if (/third place group/i.test(raw)) return 'Mejor 3er lugar';
  if (/winner group ([A-Z])/i.test(raw)) return raw.replace(/winner group ([A-Z])/i, 'Ganador Grupo $1');
  if (/winner of match/i.test(raw)) return 'Ganador por definir';
  if (/runner-up group ([A-Z])/i.test(raw)) return raw.replace(/runner-up group ([A-Z])/i, '2° Grupo $1');
  if (/tbd|to be determined/i.test(raw)) return 'Por definir';
  return raw;
}

export function displayMatchStatus(match) {
  if (!match) return 'unknown';
  const s = String(match.status || '').toUpperCase();
  if (s === 'IN_PROGRESS' || s === 'LIVE') return 'live';
  if (s === 'FINISHED' || s === 'FT') return 'finished';
  return 'scheduled';
}
