import { getClientId } from './sharedEvents';

export async function pingVisitStats() {
  const res = await fetch('/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: getClientId() })
  });
  if (!res.ok) throw new Error(`visits ${res.status}`);
  return res.json();
}

export async function fetchVisitStats() {
  const res = await fetch('/api/visits', { cache: 'no-store' });
  if (!res.ok) throw new Error(`visits ${res.status}`);
  return res.json();
}
