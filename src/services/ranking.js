// Ranking denso por puntos: si varias personas tienen el MISMO puntaje,
// comparten el mismo lugar; el siguiente puntaje distinto toma el lugar siguiente
// (1, 1, 1, 2, 3, 3 …). Los criterios secundarios (exactos, resultados,
// efectividad, nombre) solo ordenan visualmente dentro del empate, no rompen el lugar.

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nameValue(item) {
  return String(item?.name || item?.email || '').trim();
}

export function compareStandingsVisual(a, b) {
  const pointsDiff = numberValue(b?.points) - numberValue(a?.points);
  if (pointsDiff !== 0) return pointsDiff;

  const exactDiff = numberValue(b?.exactHits) - numberValue(a?.exactHits);
  if (exactDiff !== 0) return exactDiff;

  const outcomeDiff = numberValue(b?.outcomeHits) - numberValue(a?.outcomeHits);
  if (outcomeDiff !== 0) return outcomeDiff;

  const effectivenessDiff = numberValue(b?.effectiveness) - numberValue(a?.effectiveness);
  if (effectivenessDiff !== 0) return effectivenessDiff;

  return nameValue(a).localeCompare(nameValue(b), 'es', { sensitivity: 'base' });
}

export function assignDenseRanksByPoints(items = []) {
  let currentRank = 0;
  let lastPoints = null;

  return [...(items || [])]
    .sort(compareStandingsVisual)
    .map(item => {
      const points = numberValue(item?.points);
      if (lastPoints === null || points !== lastPoints) {
        currentRank += 1;
        lastPoints = points;
      }
      return { ...item, rank: currentRank, rankPoints: points };
    });
}

export function getPodiumGroups(standings = [], limit = 3) {
  const ranked = assignDenseRanksByPoints(standings).filter(item => item.rank <= limit);
  const groups = [];

  ranked.forEach(item => {
    let group = groups.find(entry => entry.rank === item.rank);
    if (!group) {
      group = { rank: item.rank, points: numberValue(item.points), players: [] };
      groups.push(group);
    }
    group.players.push(item);
  });

  return groups.sort((a, b) => a.rank - b.rank);
}

export function getDensePodiumNames(standings = [], limit = 3) {
  return getPodiumGroups(standings, limit).flatMap(group =>
    group.players.map(player => player.name)
  );
}
