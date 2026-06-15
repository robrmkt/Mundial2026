import { useState } from 'react';
import { Search, Calendar } from 'lucide-react';

export default function PredictionGrid({ matches, participants }) {
  const [selectedTab, setSelectedTab] = useState(() => {
    const hasLive = matches.some(m => m.status === 'LIVE');
    return hasLive ? 'LIVE' : 'J1';
  });
  const [searchTerm, setSearchTerm] = useState('');

  const getPredictionClass = (pred, match) => {
    if (match.status === 'SCHEDULED') return '';
    if (!pred || pred.homeScore === undefined || pred.awayScore === undefined) return '';

    const pHome = parseInt(pred.homeScore);
    const pAway = parseInt(pred.awayScore);
    const mHome = parseInt(match.homeScore);
    const mAway = parseInt(match.awayScore);

    const exactMatch = (pHome === mHome && pAway === mAway);
    const predOutcome = Math.sign(pHome - pAway);
    const actualOutcome = Math.sign(mHome - mAway);
    const outcomeMatch = (predOutcome === actualOutcome);

    if (exactMatch) return 'hit-exact';
    if (outcomeMatch) return 'hit-outcome';
    return 'missed';
  };

  // Filter matches based on selected tab
  const filteredMatches = matches.filter(m => {
    if (selectedTab === 'LIVE') return m.status === 'LIVE';
    if (selectedTab === 'J1') return m.id >= 1 && m.id <= 24;
    if (selectedTab === 'J2') return m.id >= 25 && m.id <= 48;
    if (selectedTab === 'J3') return m.id >= 49 && m.id <= 72;
    return true;
  });

  // Filter participants based on search term
  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const liveMatchesCount = matches.filter(m => m.status === 'LIVE').length;

  return (
    <div className="prediction-grid-wrapper">
      {/* Grid Controls Header */}
      <div className="grid-controls">
        {/* Tab Selector */}
        <div className="grid-tabs">
          {[
            { id: 'J1', label: 'Jornada 1', desc: '1-24' },
            { id: 'J2', label: 'Jornada 2', desc: '25-48' },
            { id: 'J3', label: 'Jornada 3', desc: '49-72' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`grid-tab-btn ${selectedTab === tab.id ? 'active' : ''}`}
            >
              <Calendar size={13} />
              <span className="tab-label">{tab.label}</span>
              <span className="tab-sub">{tab.desc}</span>
            </button>
          ))}
          
          <button
            onClick={() => setSelectedTab('LIVE')}
            className={`grid-tab-btn tab-live ${selectedTab === 'LIVE' ? 'active' : ''} ${liveMatchesCount > 0 ? 'has-live' : ''}`}
          >
            <span className="live-pulse-indicator"></span>
            <span className="tab-label">En Vivo</span>
            <span className="live-count-badge">{liveMatchesCount}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-box-container">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="grid-search-input"
            placeholder="Buscar compañero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="grid-table-container">
        {filteredMatches.length === 0 ? (
          <div className="empty-grid-state">
            {selectedTab === 'LIVE' ? (
              <p>No hay partidos en vivo actualmente. Activa la simulación en el Administrador para ver cambios aquí en tiempo real.</p>
            ) : (
              <p>No se encontraron partidos para esta categoría.</p>
            )}
          </div>
        ) : (
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="sticky-col-header">Compañero</th>
                {filteredMatches.map(m => {
                  const isLive = m.status === 'LIVE';
                  const isFinished = m.status === 'FINISHED';
                  return (
                    <th 
                      key={m.id} 
                      className={`match-header-cell ${isLive ? 'col-live' : ''}`}
                      title={`${m.homeTeam} vs ${m.awayTeam} (${m.date}) - Marcador: ${isLive || isFinished ? `${m.homeScore}-${m.awayScore}` : 'Por jugar'}`}
                    >
                      <div className="match-col-header-content">
                        <span className="match-id-tag">#{m.id}</span>
                        <div className="match-col-teams">
                          <span className="flag-mini">{m.homeFlag}</span>
                          <span className="team-code">{m.homeTeam.substring(0, 3).toUpperCase()}</span>
                          <span className="team-vs">vs</span>
                          <span className="team-code">{m.awayTeam.substring(0, 3).toUpperCase()}</span>
                          <span className="flag-mini">{m.awayFlag}</span>
                        </div>
                        { (isLive || isFinished) && (
                          <div className={`match-col-result ${isLive ? 'live-score-text' : ''}`}>
                            {m.homeScore} - {m.awayScore}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={filteredMatches.length + 1} className="no-results-cell">
                    No se encontraron colaboradores que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map(p => (
                  <tr key={p.name}>
                    <td className="sticky-col-cell">
                      <div className="participant-cell-content">
                        <div className="participant-mini-avatar">{p.avatar}</div>
                        <span className="participant-name-text">{p.name}</span>
                      </div>
                    </td>
                    {filteredMatches.map(m => {
                      const pred = p.predictions[m.id];
                      const predClass = getPredictionClass(pred, m);
                      
                      return (
                        <td key={m.id} className="pred-cell">
                          <span className={`pred-badge ${predClass}`} title={predClass === 'hit-exact' ? 'Exacto (+3 PTS)' : predClass === 'hit-outcome' ? 'Resultado (+1 PTS)' : predClass === 'missed' ? 'Fallado (0 PTS)' : 'Pronóstico'}>
                            {pred ? `${pred.homeScore}-${pred.awayScore}` : '-'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Legend */}
      <div className="grid-legend">
        <div className="legend-title">Leyenda:</div>
        <div className="legend-items">
          <span className="legend-item">
            <span className="legend-color-box hit-exact"></span>
            <span className="legend-text">Exacto (+3 PTS)</span>
          </span>
          <span className="legend-item">
            <span className="legend-color-box hit-outcome"></span>
            <span className="legend-text">Ganador/Empate (+1 PTS)</span>
          </span>
          <span className="legend-item">
            <span className="legend-color-box missed"></span>
            <span className="legend-text">Incorrecto (0 PTS)</span>
          </span>
          <span className="legend-item">
            <span className="legend-color-box pending"></span>
            <span className="legend-text">Pendiente</span>
          </span>
        </div>
      </div>
    </div>
  );
}
