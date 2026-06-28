import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, Clock, Search } from 'lucide-react';
import FlagIcon from './FlagIcon';

function pad(n) {
  return String(n).padStart(2, '0');
}

function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - now;
  if (Number.isNaN(diff) || diff <= 0) return null;
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60
  };
}

function getFeaturedMatch(matches, preferredMatchId) {
  if (preferredMatchId) {
    const manual = matches.find(m => String(m.id) === String(preferredMatchId));
    if (manual) return manual;
  }
  const live = matches.find(m => m.status === 'LIVE');
  if (live) return live;
  const next = matches
    .filter(m => m.status === 'SCHEDULED' && m.kickoff)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
  if (next) return next;
  return [...matches]
    .filter(m => m.status === 'FINISHED')
    .sort((a, b) => b.id - a.id)[0] || null;
}

function getPredictionForParticipant(participant, match) {
  // Multi-key: busca por id local, feedId, espnId, externalId y continuationPredictions
  const stores = [participant.predictions, participant.continuationPredictions];
  const keys = [String(match.id ?? ''), String(match.feedId ?? ''), String(match.espnId ?? ''), String(match.externalId ?? '')].filter(Boolean);
  for (const store of stores) {
    if (!store) continue;
    for (const key of keys) {
      if (store[key] != null) return store[key];
    }
  }
  return null;
}

function getPredictionsForMatch(match, participants) {
  if (!match) return [];
  return participants
    .map(participant => ({ participant, prediction: getPredictionForParticipant(participant, match) }))
    .filter(item => item.prediction);
}

function groupPredictionsByScore(items) {
  const groups = new Map();
  items.forEach(({ participant, prediction }) => {
    const key = `${prediction.homeScore}-${prediction.awayScore}`;
    if (!groups.has(key)) groups.set(key, { score: key, count: 0, people: [] });
    const group = groups.get(key);
    group.count += 1;
    group.people.push(participant);
  });
  return [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.score.localeCompare(b.score);
  });
}

function getOutcomeSplit(items) {
  let home = 0;
  let draw = 0;
  let away = 0;
  items.forEach(({ prediction }) => {
    const h = Number(prediction.homeScore);
    const a = Number(prediction.awayScore);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    if (h > a) home += 1;
    else if (h < a) away += 1;
    else draw += 1;
  });
  const total = home + draw + away;
  if (!total) return null;
  return {
    home,
    draw,
    away,
    total,
    homePct: Math.round((home / total) * 100),
    drawPct: Math.round((draw / total) * 100),
    awayPct: Math.round((away / total) * 100)
  };
}

function matchLabel(match) {
  return `${match.homeTeam.slice(0, 3).toUpperCase()} vs ${match.awayTeam.slice(0, 3).toUpperCase()}`;
}

function formatWhen(match) {
  if (!match?.kickoff) return match?.date || '';
  try {
    const d = new Date(match.kickoff);
    return `${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} · ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return match.date || '';
  }
}

function selectorMatches(matches) {
  const live = matches.filter(m => m.status === 'LIVE');
  const next = matches
    .filter(m => m.status === 'SCHEDULED' && m.kickoff)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .slice(0, 5);
  const finished = [...matches]
    .filter(m => m.status === 'FINISHED')
    .sort((a, b) => b.id - a.id)
    .slice(0, 3)
    .reverse();
  const seen = new Set();
  return [...live, ...next, ...finished].filter(match => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

export default function PredictionMoment({ matches, participants, preferredMatchId }) {
  const initial = useMemo(() => getFeaturedMatch(matches, preferredMatchId), [matches, preferredMatchId]);
  const [selectedId, setSelectedId] = useState(initial?.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openScores, setOpenScores] = useState(() => new Set());

  const selectedMatch = useMemo(
    () => matches.find(m => String(m.id) === String(selectedId)) || initial,
    [initial, matches, selectedId]
  );
  const countdown = useCountdown(selectedMatch?.status === 'SCHEDULED' ? selectedMatch.kickoff : null);
  const items = useMemo(() => getPredictionsForMatch(selectedMatch, participants), [participants, selectedMatch]);
  const groups = useMemo(() => groupPredictionsByScore(items), [items]);
  const split = useMemo(() => getOutcomeSplit(items), [items]);
  const chips = useMemo(() => selectorMatches(matches), [matches]);
  const filteredItems = items.filter(({ participant }) =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedMatch) {
    return <section className="prediction-moment"><div className="empty-grid-state">No hay partidos para mostrar.</div></section>;
  }

  const statusLabel = selectedMatch.status === 'LIVE'
    ? 'En vivo'
    : selectedMatch.status === 'FINISHED'
      ? 'Finalizado'
      : 'Siguiente partido';

  const toggleScore = (score) => {
    setOpenScores(prev => {
      const next = new Set(prev);
      if (next.has(score)) next.delete(score);
      else next.add(score);
      return next;
    });
  };

  return (
    <section className="prediction-moment">
      <div className="prediction-moment-head">
        <div>
          <span className="section-kicker">Pronóstico del momento</span>
          <h3>{selectedMatch.homeTeam} vs {selectedMatch.awayTeam}</h3>
        </div>
        <span className={`prediction-status status-${selectedMatch.status.toLowerCase()}`}>
          {selectedMatch.status === 'LIVE' && <span className="live-dot" />}
          {statusLabel}
        </span>
      </div>

      <div className="prediction-match-chip-row">
        {chips.map(match => (
          <button
            key={match.id}
            type="button"
            className={`prediction-match-chip ${String(match.id) === String(selectedMatch.id) ? 'active' : ''}`}
            onClick={() => setSelectedId(match.id)}
          >
            <FlagIcon team={match.homeTeam} label={match.homeTeam} />
            <span>{matchLabel(match)}</span>
            <FlagIcon team={match.awayTeam} label={match.awayTeam} />
          </button>
        ))}
      </div>

      <div className="prediction-moment-layout">
        <div className="prediction-moment-left">
          <div className={`prediction-match-card status-${selectedMatch.status.toLowerCase()}`}>
            <div className="pmc-inner">
              <div className="pmc-teams">
                <div className="pmc-team home">
                  <span className="pmc-team-name">{selectedMatch.homeTeam}</span>
                  <FlagIcon team={selectedMatch.homeTeam} label={selectedMatch.homeTeam} />
                </div>
                <div className="pmc-center">
                  {selectedMatch.status === 'SCHEDULED'
                    ? <span className="pmc-vs">VS</span>
                    : <strong className="pmc-score">{selectedMatch.homeScore}<i>-</i>{selectedMatch.awayScore}</strong>}
                </div>
                <div className="pmc-team away">
                  <FlagIcon team={selectedMatch.awayTeam} label={selectedMatch.awayTeam} />
                  <span className="pmc-team-name">{selectedMatch.awayTeam}</span>
                </div>
              </div>

              <div className="pmc-when">
                <Clock size={12} />
                <span>{formatWhen(selectedMatch)}</span>
              </div>

              {countdown && (
                <div className="pmc-clock">
                  {countdown.days > 0 && (
                    <span className="pmc-clock-unit"><strong>{pad(countdown.days)}</strong><i>D</i></span>
                  )}
                  <span className="pmc-clock-unit"><strong>{pad(countdown.hours)}</strong><i>H</i></span>
                  <span className="pmc-clock-unit"><strong>{pad(countdown.minutes)}</strong><i>M</i></span>
                  <span className="pmc-clock-unit"><strong>{pad(countdown.seconds)}</strong><i>S</i></span>
                </div>
              )}

              <div className="pmc-foot">
                <span className="pmc-loaded">{items.length} de {participants.length} pronósticos</span>
                {split && (
                  <div className="pmc-split">
                    <span className="pmc-split-home">{selectedMatch.homeTeam.slice(0, 3).toUpperCase()} {split.homePct}%</span>
                    <span className="pmc-split-draw">Empate {split.drawPct}%</span>
                    <span className="pmc-split-away">{selectedMatch.awayTeam.slice(0, 3).toUpperCase()} {split.awayPct}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="prediction-score-groups">
            <h4>Marcadores más apostados</h4>
            {groups.length === 0 ? (
              <div className="empty-grid-state">Nadie ha cargado pronóstico para este partido.</div>
            ) : groups.map(group => (
              <div key={group.score} className="prediction-score-card">
                <button type="button" onClick={() => toggleScore(group.score)}>
                  <strong>{group.score}</strong>
                  <span>{group.count} {group.count === 1 ? 'persona' : 'personas'}</span>
                  <ChevronDown size={15} className={openScores.has(group.score) ? 'is-open' : ''} />
                </button>
                {openScores.has(group.score) && (
                  <div className="prediction-score-people">
                    {group.people.map(person => <span key={person.name}>{person.name}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="prediction-moment-right">
          <div className="prediction-person-search">
            <Search size={14} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar participante..."
            />
          </div>
          <div className="prediction-person-list">
            {filteredItems.length === 0 ? (
              <div className="empty-grid-state">Sin resultados para esa búsqueda.</div>
            ) : filteredItems.map(({ participant, prediction }) => (
              <div key={participant.name} className="prediction-person-row">
                <span>{participant.name}</span>
                <strong>{prediction.homeScore}-{prediction.awayScore}</strong>
              </div>
            ))}
          </div>
          {split && (
            <div className="prediction-split-note">
              <BarChart3 size={14} />
              <span>{split.total} pronósticos agrupados por resultado.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
