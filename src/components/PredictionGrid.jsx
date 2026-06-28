import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import PredictionMoment from './PredictionMoment';
import PredictionWindowCard from './PredictionWindowCard';
import FlagIcon from './FlagIcon';
import { exportParticipantQuiniela } from '../services/quinielaExport';
import { getPredictionByMatch } from '../services/phaseContext';

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

export default function PredictionGrid({
  matches,
  participants,
  dashboardMode = 'rh_current',
  phaseMatches = [],
  activeWindow = null
}) {
  const isNewMode = dashboardMode === 'new_quiniela' || dashboardMode === 'combined';
  const matrixMatchesSource = isNewMode ? phaseMatches : matches;

  const [selectedTab, setSelectedTab] = useState(() => isNewMode ? 'NEW' : 'J1');
  const [historyOpen, setHistoryOpen] = useState(defaultHistoryOpen);
  const [preferredMatchId] = useState(() => {
    try { return window.sessionStorage.getItem('preferred_prediction_match_id'); } catch { return null; }
  });

  // Sincroniza tab cuando cambia el modo (ej: admin cambia dashboardMode)
  useEffect(() => {
    if (isNewMode && selectedTab !== 'NEW') setSelectedTab('NEW');
    if (!isNewMode && selectedTab === 'NEW') setSelectedTab('J1');
  }, [isNewMode, selectedTab]);

  const matrixTabs = useMemo(() => {
    if (isNewMode) {
      return [{ id: 'NEW', label: 'Nueva fase', desc: `${matrixMatchesSource.length} partidos` }];
    }
    return [
      { id: 'J1', label: 'Jornada 1', desc: '1-24' },
      { id: 'J2', label: 'Jornada 2', desc: '25-48' },
      { id: 'J3', label: 'Jornada 3', desc: '49-72' }
    ];
  }, [isNewMode, matrixMatchesSource.length]);

  const filteredMatches = useMemo(() => {
    if (isNewMode) return matrixMatchesSource;
    return matches.filter(m => {
      if (selectedTab === 'J1') return Number(m.id) >= 1 && Number(m.id) <= 24;
      if (selectedTab === 'J2') return Number(m.id) >= 25 && Number(m.id) <= 48;
      if (selectedTab === 'J3') return Number(m.id) >= 49 && Number(m.id) <= 72;
      return true;
    });
  }, [matches, matrixMatchesSource, selectedTab, isNewMode]);

  // Auditoría: cuántos participantes tienen pronóstico para cada partido filtrado
  const matrixAudit = useMemo(() => {
    if (!isNewMode || !filteredMatches.length || !participants.length) return null;
    const withPrediction = filteredMatches.reduce((sum, match) => {
      return sum + participants.filter(p => getPredictionByMatch(p, match)).length;
    }, 0);
    const avgCoverage = Math.round(withPrediction / filteredMatches.length);
    return {
      totalParticipants: participants.length,
      totalMatches: filteredMatches.length,
      avgCoverage
    };
  }, [isNewMode, filteredMatches, participants]);

  const momentMatches = isNewMode ? phaseMatches : matches;

  return (
    <div className="prediction-grid-wrapper">
      <PredictionWindowCard />
      <PredictionMoment
        matches={momentMatches}
        participants={participants}
        preferredMatchId={preferredMatchId}
      />

      <section className={`prediction-history ${historyOpen ? 'open' : ''}`}>
        <div className="prediction-history-head">
          <div>
            <span className="section-kicker">
              {isNewMode ? 'Nueva fase' : 'Histórico completo'}
            </span>
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

        {isNewMode && matrixAudit && (
          <div className="matrix-audit-bar">
            <span>
              <strong>{matrixAudit.totalParticipants}</strong> aprobados ·{' '}
              <strong>{matrixAudit.totalMatches}</strong> partidos ·{' '}
              promedio <strong>{matrixAudit.avgCoverage}</strong> pronósticos por partido
            </span>
          </div>
        )}

        <div className="prediction-history-content">
          <div className="grid-controls">
            <div className="grid-tabs">
              {matrixTabs.map(tab => (
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
              <div className="empty-grid-state">
                {isNewMode
                  ? 'No hay partidos configurados para la nueva fase.'
                  : 'No se encontraron partidos para esta jornada.'}
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
                          title={`${m.homeTeam} vs ${m.awayTeam} — ${isLive || isFinished ? `${m.homeScore}-${m.awayScore}` : 'Por jugar'}`}
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
                            onClick={() => exportParticipantQuiniela(p, isNewMode ? phaseMatches : matches)}
                            title={`Descargar quiniela de ${p.name}`}
                            aria-label={`Descargar quiniela de ${p.name}`}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </td>
                      {filteredMatches.map(m => {
                        const pred = getPredictionByMatch(p, m);
                        const predClass = predictionClass(pred, m);
                        const isMissing = !pred;
                        return (
                          <td key={m.id} className="pred-cell">
                            <span className={`pred-badge ${predClass} ${isMissing ? 'is-missing' : ''}`}>
                              {pred ? `${pred.homeScore}-${pred.awayScore}` : '—'}
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
