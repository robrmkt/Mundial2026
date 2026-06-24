import { useMemo, useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import PredictionMoment from './PredictionMoment';
import PredictionWindowCard from './PredictionWindowCard';
import FlagIcon from './FlagIcon';
import { exportParticipantQuiniela } from '../services/quinielaExport';

function predictionClass(pred, match) {
  if (!match || match.status === 'SCHEDULED') return '';
  if (!pred || pred.homeScore === undefined || pred.awayScore === undefined) return '';
  const pHome = parseInt(pred.homeScore, 10);
  const pAway = parseInt(pred.awayScore, 10);
  const mHome = parseInt(match.homeScore, 10);
  const mAway = parseInt(match.awayScore, 10);
  if (pHome === mHome && pAway === mAway) return 'hit-exact';
  if (Math.sign(pHome - pAway) === Math.sign(mHome - mAway)) return 'hit-outcome';
  return 'missed';
}

function defaultHistoryOpen() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return !window.matchMedia('(max-width: 760px)').matches;
}

export default function PredictionGrid({ matches, participants }) {
  const [selectedTab, setSelectedTab] = useState('J1');
  const [historyOpen, setHistoryOpen] = useState(defaultHistoryOpen);
  const [preferredMatchId] = useState(() => {
    try {
      return window.sessionStorage.getItem('preferred_prediction_match_id');
    } catch {
      return null;
    }
  });

  const filteredMatches = useMemo(() => matches.filter(m => {
    if (selectedTab === 'J1') return m.id >= 1 && m.id <= 24;
    if (selectedTab === 'J2') return m.id >= 25 && m.id <= 48;
    if (selectedTab === 'J3') return m.id >= 49 && m.id <= 72;
    return true;
  }), [matches, selectedTab]);

  return (
    <div className="prediction-grid-wrapper">
      <PredictionWindowCard />
      <PredictionMoment
        matches={matches}
        participants={participants}
        preferredMatchId={preferredMatchId}
      />

      <section className={`prediction-history ${historyOpen ? 'open' : ''}`}>
        <div className="prediction-history-head">
          <div>
            <span className="section-kicker">Histórico completo</span>
            <h3>Matriz comparativa</h3>
          </div>
          <button
            type="button"
            className="prediction-history-toggle"
            onClick={() => setHistoryOpen(open => !open)}
          >
            {historyOpen ? 'Ocultar matriz completa' : 'Ver matriz completa'}
          </button>
        </div>

        <div className="prediction-history-content">
          <div className="grid-controls">
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
            </div>
          </div>

          <div className="grid-table-container">
            {filteredMatches.length === 0 ? (
              <div className="empty-grid-state">No se encontraron partidos para esta jornada.</div>
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
                              <FlagIcon team={m.homeTeam} label={m.homeTeam} />
                              <span className="team-code">{m.homeTeam.substring(0, 3).toUpperCase()}</span>
                              <span className="team-vs">vs</span>
                              <span className="team-code">{m.awayTeam.substring(0, 3).toUpperCase()}</span>
                              <FlagIcon team={m.awayTeam} label={m.awayTeam} />
                            </div>
                            {(isLive || isFinished) && (
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
                  {participants.map(p => (
                    <tr key={p.name}>
                      <td className="sticky-col-cell">
                        <div className="participant-cell-content">
                          <div className="participant-mini-avatar">{p.avatar}</div>
                          <span className="participant-name-text">{p.name}</span>
                          <button
                            type="button"
                            className="participant-export-btn"
                            onClick={() => exportParticipantQuiniela(p, matches)}
                            title={`Descargar quiniela de ${p.name}`}
                            aria-label={`Descargar quiniela de ${p.name}`}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </td>
                      {filteredMatches.map(m => {
                        const pred = p.predictions[m.id];
                        const predClass = predictionClass(pred, m);
                        return (
                          <td key={m.id} className="pred-cell">
                            <span className={`pred-badge ${predClass}`}>
                              {pred ? `${pred.homeScore}-${pred.awayScore}` : '-'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
