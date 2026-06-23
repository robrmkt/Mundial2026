// Cintillo de partidos bajo el header: los EN VIVO van fijos, el próximo
// destacado, y el resto recorre (marquee con pausa al hover; en móvil scroll).
// Respeta prefers-reduced-motion (sin auto-scroll).
import { useMemo } from 'react';
import FlagIcon from './FlagIcon';

function fmtWhen(iso) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return '';
  }
}

export default function MatchTicker({ matches = [] }) {
  const live = useMemo(() => matches.filter(m => m.status === 'LIVE'), [matches]);
  const upcoming = useMemo(
    () => matches
      .filter(m => m.status === 'SCHEDULED' && m.kickoff)
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)),
    [matches]
  );
  const next = upcoming[0];
  const rest = upcoming.slice(1, 14);

  if (live.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="match-ticker" aria-label="Partidos del Mundial">
      {live.map(m => (
        <span key={m.id} className="ticker-item ticker-live">
          <span className="live-dot" /> EN VIVO · <FlagIcon team={m.homeTeam} label={m.homeTeam} /> {m.homeTeam} {m.homeScore}-{m.awayScore} {m.awayTeam} <FlagIcon team={m.awayTeam} label={m.awayTeam} /> {m.displayClock || `${m.minute}'`}
        </span>
      ))}
      {next && (
        <span className="ticker-item ticker-next">
          PRÓXIMO · <FlagIcon team={next.homeTeam} label={next.homeTeam} /> {next.homeTeam} vs {next.awayTeam} <FlagIcon team={next.awayTeam} label={next.awayTeam} /> · {fmtWhen(next.kickoff)}
        </span>
      )}
      {rest.length > 0 && (
        <div className="ticker-marquee">
          <div className="ticker-track">
            {[...rest, ...rest].map((m, i) => (
              <span key={`${m.id}-${i}`} className="ticker-item ticker-rest">
                <FlagIcon team={m.homeTeam} label={m.homeTeam} /> {m.homeTeam} vs {m.awayTeam} <FlagIcon team={m.awayTeam} label={m.awayTeam} /> · {fmtWhen(m.kickoff)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
