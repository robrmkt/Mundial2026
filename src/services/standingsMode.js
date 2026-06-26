export function getDashboardMode(settings) {
  const mode = settings?.dashboardMode || 'auto';
  if (mode !== 'auto') return mode;

  const startAt = Date.parse(settings?.startAt || '');
  const hasStarted = Number.isFinite(startAt) && Date.now() >= startAt;

  if (hasStarted) return 'new_quiniela';
  return 'rh_current';
}
