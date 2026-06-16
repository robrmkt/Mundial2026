// Cliente del bus de eventos compartido (Fase 1).
// Permite que una reacción/gol/cambio de líder en un navegador se vea en TODOS.
// El servidor (server.js) guarda los eventos en /api/events y los limpia solo.

const CLIENT_ID_KEY = 'quiniela_client_id';
const SEEN_EVENTS_KEY = 'quiniela_seen_events';
const SEEN_CAP = 300; // recordamos los últimos N ids vistos en esta pestaña

// Cada navegador/pestaña tiene un id estable (sessionStorage), para no
// re-animar en el mismo cliente lo que él mismo acaba de lanzar.
export function getClientId() {
  try {
    let id = window.sessionStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'client_anon';
  }
}

function readSeen() {
  try {
    const raw = window.sessionStorage.getItem(SEEN_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hasSeenEvent(id) {
  if (!id) return true;
  return readSeen().includes(id);
}

export function markEventSeen(id) {
  if (!id) return;
  try {
    const seen = readSeen();
    if (seen.includes(id)) return;
    seen.push(id);
    const trimmed = seen.slice(-SEEN_CAP);
    window.sessionStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify(trimmed));
  } catch {
    /* sessionStorage lleno o no disponible: no es crítico */
  }
}

// Lee los eventos publicados después de `since` (ISO string o epoch ms).
// Devuelve { events, serverTime } para encadenar el siguiente sondeo.
export async function fetchEventsSince(since) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`/api/events${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`events ${res.status}`);
  return res.json();
}

// Publica un evento en el bus. `clientId` viaja en el payload para que el
// emisor no se auto-anime al recibirlo de vuelta.
export async function postEvent({ type, payload = {}, dedupeKey = '' }) {
  const event = {
    type,
    dedupeKey,
    payload: { ...payload, clientId: getClientId() }
  };
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event })
    });
    if (!res.ok) throw new Error(`postEvent ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('No pude publicar el evento:', error);
    return null;
  }
}

export async function postLuck(target) {
  try {
    const res = await fetch('/api/luck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, clientId: getClientId() })
    });
    if (!res.ok) throw new Error(`luck ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('No pude enviar suerte:', error);
    return null;
  }
}

export async function postBoo({ matchId, team }) {
  try {
    const res = await fetch('/api/boo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, team, clientId: getClientId() })
    });
    if (!res.ok) throw new Error(`boo ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('No pude enviar abucheo:', error);
    return null;
  }
}

export async function postSupport({ matchId, side, amount = 1 }) {
  try {
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, side, amount })
    });
    if (!res.ok) throw new Error(`support ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('No pude enviar apoyo:', error);
    return null;
  }
}

export async function postRankingSnapshot(snapshot) {
  try {
    const res = await fetch('/api/ranking-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error(`snapshot ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('No pude guardar el snapshot de ranking:', error);
    return null;
  }
}

// ¿este evento lo lanzó este mismo cliente? (para no auto-animarse)
export function isOwnEvent(event) {
  return event?.payload?.clientId && event.payload.clientId === getClientId();
}
