export function buildSafeCombinedStandings({ rhStandings = [], newQuinielaStandings = [], participants = [] }) {
  const byKey = new Map();

  function getKey(item) {
    return String(item.email || item.name || '').trim().toLowerCase();
  }

  rhStandings.forEach(item => {
    const key = getKey(item);
    if (!key) return;
    byKey.set(key, {
      ...item,
      rhPoints: Number(item.points || 0),
      newPoints: 0,
      points: Number(item.points || 0),
      source: 'rh'
    });
  });

  newQuinielaStandings.forEach(item => {
    const key = getKey(item);
    if (!key) return;
    const existing = byKey.get(key);
    const newPoints = Number(item.points || 0);
    if (existing) {
      byKey.set(key, {
        ...existing,
        email: existing.email || item.email,
        team: existing.team || item.team,
        photo: existing.photo || item.photo,
        avatar: existing.avatar || item.avatar,
        rhPoints: Number(existing.rhPoints || 0),
        newPoints,
        points: Number(existing.rhPoints || 0) + newPoints,
        exactHits: Number(existing.exactHits || 0) + Number(item.exactHits || 0),
        source: 'combined'
      });
    } else {
      byKey.set(key, { ...item, rhPoints: 0, newPoints, points: newPoints, source: 'new' });
    }
  });

  return Array.from(byKey.values())
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if ((b.exactHits || 0) !== (a.exactHits || 0)) return (b.exactHits || 0) - (a.exactHits || 0);
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
