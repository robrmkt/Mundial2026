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
