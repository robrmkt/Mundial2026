export async function fetchContinuationProfile(email) {
  const res = await fetch('/api/continuation/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'No pude validar el correo.');
  return data;
}

export function inferTeamFromEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (value.endsWith('@bacherzoppi.com')) return 'bz';
  if (value.endsWith('@uppharma.com')) return 'up';
  return '';
}

export function teamLabel(team) {
  if (team === 'bz') return 'Team BZ';
  if (team === 'up') return 'Team UP';
  return 'Sin team';
}
