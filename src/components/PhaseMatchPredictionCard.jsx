import { Clock, Lock } from 'lucide-react';
import FlagIcon from './FlagIcon';
import { isMatchLocked, getMatchKickoff, getMatchLockAt } from '../services/matchLock';
import { displayTeamName, isPlaceholderTeam } from '../services/teamDisplay';

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatShortTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function ScoreInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min="0"
      max="99"
      className={`newq-score-input${disabled ? ' disabled' : ''}`}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder="0"
      disabled={disabled}
    />
  );
}

export default function PhaseMatchPredictionCard({ match, pred = {}, onChange, variant = 'card' }) {
  const kickoff = getMatchKickoff(match);
  const lockAt = getMatchLockAt(match);
  const locked = isMatchLocked(match);
  const homePlaceholder = isPlaceholderTeam(match.homeTeam);
  const awayPlaceholder = isPlaceholderTeam(match.awayTeam);
  const isPending = homePlaceholder || awayPlaceholder;

  const hasPred = pred.home !== undefined && pred.home !== '' && pred.away !== undefined && pred.away !== '';

  // ── COMPACT variant (mobile rows) ──
  if (variant === 'compact') {
    if (isPending) return null; // pending matches shown by PendingRoundsSummary, not here

    let statusLabel = '';
    let statusCls = '';
    if (locked && hasPred)       { statusLabel = 'Capturado'; statusCls = 'status-captured'; }
    else if (locked && !hasPred) { statusLabel = 'Cerrado sin dato'; statusCls = 'status-closed-no-pred'; }
    else if (!locked && hasPred) { statusLabel = 'Capturado'; statusCls = 'status-captured'; }
    else                         { statusLabel = 'Pendiente'; statusCls = 'status-needs-pred'; }

    return (
      <div className={`newq-match-row${locked ? ' is-locked' : ''}`}>
        <div className="newq-match-row-left">
          <div className="newq-match-row-teams">
            <span className="newq-row-team">
              <FlagIcon team={match.homeTeam} size={16} />
              {displayTeamName(match.homeTeam)}
            </span>
            <span className="newq-row-vs">vs</span>
            <span className="newq-row-team">
              {displayTeamName(match.awayTeam)}
              <FlagIcon team={match.awayTeam} size={16} />
            </span>
          </div>
          <div className="newq-match-row-meta">
            {kickoff && <span>{new Date(kickoff).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
            {lockAt && !locked && <span className="newq-row-closes"> · Cierra {formatShortTime(lockAt)}</span>}
            <span className={`newq-row-status ${statusCls}`}>{statusLabel}</span>
          </div>
        </div>
        <div className="newq-row-score">
          {locked ? (
            <span className="newq-row-score-locked">
              {hasPred ? `${pred.home} – ${pred.away}` : <Lock size={13} />}
            </span>
          ) : (
            <>
              <ScoreInput value={pred.home} onChange={v => onChange(match.id, 'home', v)} disabled={false} />
              <span className="newq-row-sep">–</span>
              <ScoreInput value={pred.away} onChange={v => onChange(match.id, 'away', v)} disabled={false} />
            </>
          )}
        </div>
      </div>
    );
  }

  // ── CARD variant (desktop / default) ──
  if (isPending) {
    return (
      <div className="newq-match-card is-pending">
        <div className="newq-match-top">
          <div className="newq-team-side">
            <span className="newq-team-name pending">{displayTeamName(match.homeTeam)}</span>
          </div>
          <span className="newq-vs">vs</span>
          <div className="newq-team-side right">
            <span className="newq-team-name pending">{displayTeamName(match.awayTeam)}</span>
          </div>
        </div>
        <p className="newq-pending-msg">Se activará cuando se confirmen los equipos y horario.</p>
      </div>
    );
  }

  return (
    <div className={`newq-match-card${locked ? ' is-locked' : ''}`}>
      <div className="newq-match-top">
        <div className="newq-team-side">
          <FlagIcon team={match.homeTeam} size={28} />
          <span className="newq-team-name">{displayTeamName(match.homeTeam)}</span>
        </div>
        <span className="newq-vs">vs</span>
        <div className="newq-team-side right">
          <span className="newq-team-name">{displayTeamName(match.awayTeam)}</span>
          <FlagIcon team={match.awayTeam} size={28} />
        </div>
      </div>

      <div className="newq-match-time-card">
        <div className="newq-match-time-main">
          <Clock size={13} />
          <span>{formatShortDate(kickoff)}</span>
        </div>
        {lockAt && !locked && (
          <div className="newq-match-lock-main">Cierra {formatShortTime(lockAt)}</div>
        )}
      </div>

      {locked ? (
        <div className="newq-locked-row">
          <Lock size={13} />
          <span>Cerrado para pronósticos</span>
          {hasPred && (
            <span className="newq-locked-pred">{pred.home} – {pred.away}</span>
          )}
        </div>
      ) : (
        <div className="newq-score-box">
          <ScoreInput value={pred.home} onChange={v => onChange(match.id, 'home', v)} />
          <span className="newq-score-sep">–</span>
          <ScoreInput value={pred.away} onChange={v => onChange(match.id, 'away', v)} />
        </div>
      )}
    </div>
  );
}
