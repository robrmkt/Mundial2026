export const LOCK_MINUTES_BEFORE_KICKOFF = 10;

export function getMatchKickoff(match) {
  return match?.kickoff || match?.utcDate || match?.dateTime || null;
}

export function getMatchLockAt(match, lockMinutes = LOCK_MINUTES_BEFORE_KICKOFF) {
  const kickoff = getMatchKickoff(match);
  if (!kickoff) return null;
  const ms = Date.parse(kickoff);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms - lockMinutes * 60 * 1000).toISOString();
}

export function isMatchLocked(match, now = Date.now(), lockMinutes = LOCK_MINUTES_BEFORE_KICKOFF) {
  const lockAt = getMatchLockAt(match, lockMinutes);
  if (!lockAt) return true;
  return now >= Date.parse(lockAt);
}

export function isMatchConfirmed(match) {
  const home = String(match?.homeTeam || '').trim();
  const away = String(match?.awayTeam || '').trim();
  return Boolean(home && away && !/por definir|tbd|to be determined/i.test(`${home} ${away}`) && getMatchKickoff(match));
}
