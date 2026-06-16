// Helpers de "tiempo en podio" / Modo Leyenda.

// ms -> "1d 14h 24m" (compacto).
export function formatPodiumTime(ms) {
  const totalMin = Math.floor((ms || 0) / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

// Leyenda del Podio = quien más tiempo acumulado lleva en el top 3.
export function getLegend(podiumHistory = {}) {
  let best = null;
  Object.entries(podiumHistory).forEach(([name, e]) => {
    if (name.startsWith('_') || !e || typeof e !== 'object') return;
    const totalMs = e.totalMs || 0;
    if (!best || totalMs > best.totalMs) best = { name, totalMs, entries: e.entries || 0 };
  });
  return best && best.totalMs > 0 ? best : null;
}

export function podiumMsFor(podiumHistory = {}, name) {
  const e = podiumHistory[name];
  return e && typeof e === 'object' ? (e.totalMs || 0) : 0;
}
