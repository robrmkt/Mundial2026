export async function fetchPredictionWindows() {
  const res = await fetch('/api/prediction-windows');
  if (!res.ok) throw new Error('Could not fetch prediction windows');
  return res.json();
}

export async function savePredictionWindow(window) {
  const method = window.id ? 'PUT' : 'POST';
  const url = window.id ? `/api/prediction-windows/${window.id}` : '/api/prediction-windows';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(window)
  });
  if (!res.ok) throw new Error('Error al guardar ventana');
  return res.json();
}

export async function deletePredictionWindow(id) {
  const res = await fetch(`/api/prediction-windows/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar ventana');
  return res.json();
}

export async function fetchPhaseSubmissions(windowId) {
  const url = windowId ? `/api/phase-submissions?windowId=${encodeURIComponent(windowId)}` : '/api/phase-submissions';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener submissions');
  return res.json();
}

export async function savePhaseSubmission({ email, windowId, participantName, team, userType, predictions, matchMeta }) {
  const res = await fetch('/api/phase-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, windowId, participantName, team, userType, predictions, matchMeta })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al guardar pronósticos');
  }
  return res.json();
}

export async function approvePhaseSubmission(id) {
  const res = await fetch(`/api/phase-submissions/${id}/approve`, { method: 'POST' });
  if (!res.ok) throw new Error('Error al aprobar');
  return res.json();
}

export async function rejectPhaseSubmission(id, reason = '') {
  const res = await fetch(`/api/phase-submissions/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error('Error al rechazar');
  return res.json();
}

export async function deletePhaseSubmission(id) {
  const res = await fetch(`/api/phase-submissions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar');
  return res.json();
}

export function getWindowStatus(window) {
  if (!window) return 'none';
  const now = Date.now();
  const openAt = window.openAt ? Date.parse(window.openAt) : null;
  const closeAt = window.closeAt ? Date.parse(window.closeAt) : null;
  if (window.status === 'closed' || (closeAt && now > closeAt)) return 'closed';
  if (window.status === 'open' || (openAt && now >= openAt)) return 'open';
  if (openAt && now < openAt) return 'scheduled';
  return window.status || 'draft';
}

export function formatWindowDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
}

export async function freezeCapitalHumanoArchive(payload) {
  const res = await fetch('/api/capital-humano/archive/freeze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Error al congelar histórico');
  return res.json();
}

export async function fetchCapitalHumanoArchive() {
  const res = await fetch('/api/capital-humano/archive', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error al leer histórico');
  return res.json();
}
