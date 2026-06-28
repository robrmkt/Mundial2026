// Hora canónica de cierre RH / inicio Nueva Quiniela (fuente única de verdad).
export const DEFAULT_NEW_QUINIELA_START_AT = '2026-06-27T23:00:00-06:00';

export function getDashboardMode(settings) {
  const mode = settings?.dashboardMode || 'auto';
  if (mode !== 'auto') return mode;

  const startAt = Date.parse(settings?.startAt || DEFAULT_NEW_QUINIELA_START_AT);
  const hasStarted = Number.isFinite(startAt) && Date.now() >= startAt;

  if (hasStarted) return 'new_quiniela';
  return 'rh_current';
}
