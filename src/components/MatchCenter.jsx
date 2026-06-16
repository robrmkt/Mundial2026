import { useCallback, useEffect, useState } from 'react';
import { X, MapPin, Users, RefreshCw, ListOrdered, BarChart3 } from 'lucide-react';
import { fetchMatchSummary } from '../services/liveData';

function formatKickoff(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

// "Actualizado hace X" relativo, para que se note que el feed está vivo.
function relativeTime(iso, nowMs) {
  if (!iso) return '';
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 5) return 'hace un momento';
  if (diff < 60) return `hace ${diff} s`;
  const min = Math.floor(diff / 60);
  return `hace ${min} min`;
}

function TeamBadge({ logo, flag, name }) {
  return (
    <div className="mc-team">
      {logo ? (
        <img src={logo} alt={name} className="mc-team-logo" />
      ) : (
        <span className="mc-team-flag">{flag}</span>
      )}
      <span className="mc-team-name">{name}</span>
    </div>
  );
}

export default function MatchCenter({ match, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('timeline');
  const [now, setNow] = useState(() => Date.now());

  // Reloj suave para el "actualizado hace X" (solo mientras el panel está abierto).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const isLive = match.status === 'LIVE';
  const isScheduled = match.status === 'SCHEDULED';

  const loadSummary = useCallback(async () => {
    if (!match.espnId) {
      setLoading(false);
      return;
    }
    try {
      setError('');
      const data = await fetchMatchSummary(match.espnId);
      setSummary(data);
    } catch (err) {
      console.error(err);
      setError('No pude obtener la cronología en este momento.');
    } finally {
      setLoading(false);
    }
  }, [match.espnId]);

  useEffect(() => {
    const initialLoad = setTimeout(loadSummary, 0);
    const interval = isLive ? setInterval(loadSummary, 30000) : null;
    return () => {
      clearTimeout(initialLoad);
      if (interval) clearInterval(interval);
    };
  }, [loadSummary, isLive]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const statsTeams = summary?.teams || [];
  const hasStats = statsTeams.length === 2 && statsTeams.some(t => t.stats.length > 0);
  const possessionHome = Number.parseFloat(statsTeams[0]?.stats.find(s => s.key === 'possessionPct')?.value) || 50;

  return (
    <div className="mc-overlay" onClick={onClose}>
      <div className="mc-panel" onClick={(event) => event.stopPropagation()}>
        <div className="mc-topbar">
          <span className="mc-competition">Copa Mundial FIFA 26 · Fase de grupos</span>
          <button className="mc-close-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="mc-scoreboard">
          <TeamBadge logo={match.homeLogo} flag={match.homeFlag} name={match.homeTeam} />
          <div className="mc-score-center">
            {isScheduled ? (
              <span className="mc-score-pending">VS</span>
            ) : (
              <span className="mc-score">{match.homeScore}<i>–</i>{match.awayScore}</span>
            )}
            <span className={`mc-status-chip ${isLive ? 'live' : match.status === 'FINISHED' ? 'finished' : 'scheduled'}`}>
              {isLive && <span className="live-dot" />}
              {isLive
                ? (match.isHalftime ? 'Medio tiempo' : `${match.displayClock || `${match.minute}'`} En vivo`)
                : match.status === 'FINISHED'
                  ? 'Final'
                  : formatKickoff(match.kickoff) || match.date}
            </span>
          </div>
          <TeamBadge logo={match.awayLogo} flag={match.awayFlag} name={match.awayTeam} />
        </div>

        {(match.venue || summary?.attendance) && (
          <div className="mc-venue-row">
            {match.venue && (
              <span><MapPin size={13} /> {match.venue}{match.city ? `, ${match.city}` : ''}</span>
            )}
            {summary?.attendance && (
              <span><Users size={13} /> {Number(summary.attendance).toLocaleString('es-MX')} asistentes</span>
            )}
          </div>
        )}

        <div className="mc-tabs">
          <button className={`mc-tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>
            <ListOrdered size={14} /> Cronología
          </button>
          <button className={`mc-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
            <BarChart3 size={14} /> Estadísticas
          </button>
          {isLive && (
            <button className="mc-refresh" onClick={loadSummary} title="Actualizar ahora">
              <RefreshCw size={14} />
            </button>
          )}
          {summary?.fetchedAt && tab === 'timeline' && !loading && (
            <span className="mc-updated">Actualizado {relativeTime(summary.fetchedAt, now)}</span>
          )}
        </div>

        <div className="mc-body">
          {!match.espnId ? (
            <div className="mc-empty">Este partido todavía no está vinculado al feed en vivo. Usa “Sincronizar” en el encabezado.</div>
          ) : loading ? (
            <div className="mc-empty">Cargando datos del partido…</div>
          ) : error ? (
            <div className="mc-empty">{error}</div>
          ) : tab === 'timeline' ? (
            summary?.timeline?.length ? (
              <ul className="mc-timeline">
                {summary.timeline.map(ev => (
                  <li key={ev.id} className={`mc-event ${ev.isGoal ? 'is-goal' : ''}`}>
                    <span className="mc-event-minute">{ev.minute || '—'}</span>
                    <span className="mc-event-icon">{ev.icon}</span>
                    <div className="mc-event-copy">
                      {ev.label && <strong>{ev.label}{ev.team ? ` · ${ev.team}` : ''}</strong>}
                      <span>{ev.text}{ev.player ? ` — ${ev.player}` : ''}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mc-empty">
                {isScheduled
                  ? 'El partido aún no comienza. La cronología aparecerá aquí en vivo.'
                  : isLive
                    ? 'En cuanto pase algo (gol, tarjeta, cambio) aparece aquí al instante.'
                    : 'No se registraron jugadas destacadas en este partido.'}
              </div>
            )
          ) : hasStats ? (
            <div className="mc-stats">
              <div className="mc-possession">
                <div className="mc-possession-labels">
                  <span>{statsTeams[0].name}</span>
                  <strong>Posesión</strong>
                  <span>{statsTeams[1].name}</span>
                </div>
                <div className="mc-possession-bar">
                  <div className="mc-possession-home" style={{ width: `${possessionHome}%` }}>
                    {statsTeams[0].stats.find(s => s.key === 'possessionPct')?.value || ''}
                  </div>
                  <div className="mc-possession-away">
                    {statsTeams[1].stats.find(s => s.key === 'possessionPct')?.value || ''}
                  </div>
                </div>
              </div>
              {statsTeams[0].stats
                .filter(s => s.key !== 'possessionPct')
                .map(stat => {
                  const awayStat = statsTeams[1].stats.find(s => s.key === stat.key);
                  return (
                    <div key={stat.key} className="mc-stat-row">
                      <span className="mc-stat-value">{stat.value}</span>
                      <span className="mc-stat-label">{stat.label}</span>
                      <span className="mc-stat-value">{awayStat?.value ?? '—'}</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="mc-empty">
              {isScheduled ? 'Las estadísticas aparecerán cuando ruede el balón.' : 'Sin estadísticas disponibles.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
