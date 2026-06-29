import { groupMatchesByRound, ROUND_LABELS, ROUND_ORDER } from '../services/phaseRounds';

export default function PendingRoundsSummary({ matches = [] }) {
  if (!matches.length) return null;

  const byRound = groupMatchesByRound(matches);
  const roundsWithMatches = ROUND_ORDER.filter(r => (byRound[r] || []).length > 0);

  if (!roundsWithMatches.length) return null;

  return (
    <div className="newq-pending-rounds">
      <p className="newq-pending-rounds-title">Próximas rondas</p>
      <p className="newq-pending-rounds-hint">Se activarán cuando se definan los cruces.</p>
      <div className="newq-pending-rounds-list">
        {roundsWithMatches.map(round => (
          <div key={round} className="newq-pending-round-item">
            <span className="newq-pending-round-label">{ROUND_LABELS[round] || round}</span>
            <span className="newq-pending-round-count">{byRound[round].length} partido{byRound[round].length !== 1 ? 's' : ''} por definir</span>
          </div>
        ))}
      </div>
    </div>
  );
}
