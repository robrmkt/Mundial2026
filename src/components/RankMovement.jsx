// Flecha de movimiento de ranking: ▲ +n (subió), ▼ -n (bajó), — (igual).
export default function RankMovement({ delta, className = '' }) {
  if (delta == null) return null;
  if (delta > 0) {
    return <span className={`rank-move up ${className}`} title={`Subió ${delta}`}>▲ {delta}</span>;
  }
  if (delta < 0) {
    return <span className={`rank-move down ${className}`} title={`Bajó ${Math.abs(delta)}`}>▼ {Math.abs(delta)}</span>;
  }
  return <span className={`rank-move flat ${className}`} title="Sin cambio">—</span>;
}
