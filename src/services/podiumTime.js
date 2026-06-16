// Helpers de "tiempo en podio" / Modo Leyenda.

// ms -> "1d 14h 24m" (compacto). Con withSeconds: "1d 14h 24m 07s" (para el minutero vivo).
export function formatPodiumTime(ms, withSeconds = false) {
  const totalSec = Math.floor((ms || 0) / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  if (withSeconds) parts.push(`${String(s).padStart(2, '0')}s`);
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
