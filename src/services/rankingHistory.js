// Movimiento de ranking a partir de los snapshots guardados en el servidor.

// delta por participante = rank previo - rank actual (positivo = subió).
export function computeMovement(standings = [], snapshots = []) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return {};
  const last = snapshots[snapshots.length - 1];
  const prevRank = {};
  (last.ranking || []).forEach(r => { prevRank[r.name] = r.rank; });
  const movement = {};
  standings.forEach(p => {
    const pr = prevRank[p.name];
    movement[p.name] = (pr != null) ? (pr - p.rank) : null;
  });
  return movement;
}

// Firma del orden actual (para detectar si cambió y conviene guardar snapshot).
export function rankingSignature(standings = []) {
  return standings.map(p => p.name).join('|');
}

// El ranking serializable para un snapshot.
export function toSnapshot(standings = []) {
  return standings.map(p => ({ name: p.name, rank: p.rank, points: p.points }));
}
