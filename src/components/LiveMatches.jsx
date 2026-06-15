import { useMemo, useState } from 'react';
import { Calendar, Play, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import MatchCenter from './MatchCenter';

function TeamRow({ name, flag, logo, score, winner, showScore }) {
  return (
    <div className={`mt-team-row ${winner ? 'is-winner' : ''}`}>
      <div className="mt-team-id">
        {logo ? <img src={logo} alt={name} className="mt-team-logo" /> : <span className="mt-team-flag">{flag}</span>}
        <span className="mt-team-name">{name}</span>
      </div>
      <span className="mt-team-score">{showScore ? score : ''}</span>
    </div>
  );
}

export default function LiveMatches({ matches }) {
  const [filter, setFilter] = useState('ALL');
  const [selectedMatch, setSelectedMatch] = useState(null);

  const filteredMatches = matches.filter(m => {
    if (filter === 'ALL') return true;
    return m.status === filter;
  });

  // Agrupar por fecha para una lectura tipo calendario
  const groupedByDate = useMemo(() => {
    const groups = [];
    let current = null;
    filteredMatches.forEach(m => {
      if (!current || current.date !== m.date) {
        current = { date: m.date, items: [] };
        groups.push(current);
      }
      current.items.push(m);
    });
    return groups;
  }, [filteredMatches]);

  // Mantener el partido seleccionado sincronizado con los datos más recientes
  const liveSelected = selectedMatch
    ? matches.find(m => m.id === selectedMatch.id) || selectedMatch
    : null;

  return (
    <div className="page-card">
      <div className="matches-page-header">
        <h2 className="section-title">
          <Play size={20} />
          Partidos del Mundial
        </h2>
        <span className="matches-page-hint">Toca un partido para ver la cronología minuto a minuto</span>
      </div>

      {/* Filter Tabs */}
      <div className="matches-filter-bar">
        {[
          { id: 'ALL', label: 'Todos', icon: <Calendar size={13} /> },
          { id: 'LIVE', label: 'En Vivo', icon: <Play size={13} />, isLive: true },
          { id: 'FINISHED', label: 'Terminados', icon: <CheckCircle size={13} /> },
          { id: 'SCHEDULED', label: 'Por Jugar', icon: <Clock size={13} /> }
        ].map(f => {
          const count = matches.filter(m => f.id === 'ALL' || m.status === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`filter-pill ${filter === f.id ? 'active' : ''} ${f.isLive && count > 0 ? 'live-highlight' : ''}`}
            >
              {f.icon}
              <span className="pill-label">{f.label}</span>
              <span className="pill-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Matches grouped by day */}
      <div className="matches-day-list">
        {groupedByDate.length === 0 ? (
          <div className="empty-matches-state">
            No hay partidos en esta categoría en este momento.
          </div>
        ) : (
          groupedByDate.map(group => (
            <section key={group.date} className="match-day-group">
              <h3 className="match-day-title">{group.date}</h3>
              <div className="match-day-grid">
                {group.items.map(m => {
                  const isLive = m.status === 'LIVE';
                  const isFinished = m.status === 'FINISHED';
                  const showScore = isLive || isFinished;
                  const homeWins = isFinished && m.homeScore > m.awayScore;
                  const awayWins = isFinished && m.awayScore > m.homeScore;

                  return (
                    <button
                      key={m.id}
                      className={`match-tile ${isLive ? 'is-live' : ''} ${isFinished ? 'is-finished' : ''}`}
                      onClick={() => setSelectedMatch(m)}
                    >
                      <div className="match-tile-status">
                        {isLive ? (
                          <span className="status-live-chip">
                            <span className="live-dot" />
                            {m.isHalftime ? 'MT' : (m.displayClock || `${m.minute}'`)}
                          </span>
                        ) : isFinished ? (
                          <span className="status-final-chip">Final</span>
                        ) : (
                          <span className="status-pre-chip">
                            {m.kickoff
                              ? new Date(m.kickoff).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                              : 'Por jugar'}
                          </span>
                        )}
                        <span className="match-tile-id">#{m.id}</span>
                      </div>

                      <TeamRow name={m.homeTeam} flag={m.homeFlag} logo={m.homeLogo} score={m.homeScore} winner={homeWins} showScore={showScore} />
                      <TeamRow name={m.awayTeam} flag={m.awayFlag} logo={m.awayLogo} score={m.awayScore} winner={awayWins} showScore={showScore} />

                      <div className="match-tile-footer">
                        <span className="match-tile-venue">{m.venue || 'Copa Mundial FIFA 26'}</span>
                        <ChevronRight size={14} className="match-tile-arrow" />
                      </div>

                      {isLive && (
                        <div className="live-progress-container">
                          <div className="live-progress-bar" style={{ width: `${Math.min((m.minute / 90) * 100, 100)}%` }}></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {liveSelected && (
        <MatchCenter match={liveSelected} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}
