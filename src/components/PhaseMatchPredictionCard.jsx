import { Clock, Lock } from 'lucide-react';
import FlagIcon from './FlagIcon';
import { isMatchLocked, getMatchKickoff, getMatchLockAt } from '../services/matchLock';
import { displayTeamName, isPlaceholderTeam } from '../services/teamDisplay';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ScoreInput({ value, onChange, disabled }) {
  return (
    <input
      type="number" min="0" max="99"
      className={`newq-score-input${disabled ? ' disabled' : ''}`}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder="—"
      disabled={disabled}
    />
  );
}

export default function PhaseMatchPredictionCard({ match, pred = {}, onChange }) {
  const kickoff = getMatchKickoff(match);
  const lockAt = getMatchLockAt(match);
  const locked = isMatchLocked(match);
  const homePlaceholder = isPlaceholderTeam(match.homeTeam);
  const awayPlaceholder = isPlaceholderTeam(match.awayTeam);
  const isPending = homePlaceholder || awayPlaceholder;

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

      <div className="newq-match-time">
        <Clock size={12} />
        <span>{formatDate(kickoff)}</span>
        {lockAt && !locked && <span className="newq-lock-note">· cierra {formatDate(lockAt)}</span>}
      </div>

      {locked ? (
        <div className="newq-locked-row">
          <Lock size={13} />
          <span>Cerrado para pronósticos</span>
          {(pred.home !== undefined && pred.away !== undefined && pred.home !== '' && pred.away !== '') && (
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
