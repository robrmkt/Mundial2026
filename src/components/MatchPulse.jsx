import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { BarChart3 } from 'lucide-react';
import { postSupport } from '../services/sharedEvents';
import FlagIcon from './FlagIcon';

const HOME_COLORS = ['#0E7C4A', '#ffffff', '#D7282F'];
const AWAY_COLORS = ['#1D4ED8', '#ffffff', '#85B7EB'];

let lastBurstAt = 0;

function predictionSplit(participants, matchId) {
  let home = 0;
  let draw = 0;
  let away = 0;
  participants.forEach(p => {
    const pred = p.predictions?.[matchId];
    if (!pred) return;
    const h = Number(pred.homeScore);
    const a = Number(pred.awayScore);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    if (h > a) home += 1;
    else if (h < a) away += 1;
    else draw += 1;
  });
  const total = home + draw + away;
  if (!total) return null;
  return {
    home: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    away: Math.round((away / total) * 100),
    total
  };
}

function burst(el, colors) {
  if (typeof confetti !== 'function' || !el) return;
  const now = Date.now();
  if (now - lastBurstAt < 180) return;
  lastBurstAt = now;
  const r = el.getBoundingClientRect();
  confetti({
    particleCount: 14,
    spread: 38,
    startVelocity: 20,
    scalar: 0.62,
    ticks: 60,
    colors,
    disableForReducedMotion: true,
    origin: {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight
    }
  });
}

function floatPlusOne(el, color) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const span = document.createElement('span');
  span.className = 'sup-plus match-pulse-plus';
  span.textContent = '+1';
  span.style.left = `${r.left + r.width / 2}px`;
  span.style.top = `${r.top}px`;
  span.style.color = color;
  document.body.appendChild(span);
  setTimeout(() => span.remove(), 700);
}

export default function MatchPulse({ match, participants = [], support = {}, onOpenPredictionsForMatch }) {
  const [localTaps, setLocalTaps] = useState({ home: 0, away: 0 });
  const pendingRef = useRef({ matchId: match?.id, home: 0, away: 0 });
  const trackedIdRef = useRef(match?.id);

  useEffect(() => {
    if (match?.id === trackedIdRef.current) return;
    trackedIdRef.current = match?.id;
    pendingRef.current = { matchId: match?.id, home: 0, away: 0 };
    setLocalTaps({ home: 0, away: 0 });
  }, [match?.id]);

  useEffect(() => {
    const id = setInterval(() => {
      const p = pendingRef.current;
      if (!p.matchId || (p.home === 0 && p.away === 0)) return;
      if (p.home > 0) postSupport({ matchId: p.matchId, side: 'home', amount: p.home });
      if (p.away > 0) postSupport({ matchId: p.matchId, side: 'away', amount: p.away });
      pendingRef.current = { matchId: p.matchId, home: 0, away: 0 };
    }, 500);
    return () => clearInterval(id);
  }, []);

  const pred = useMemo(() => predictionSplit(participants, match?.id), [participants, match?.id]);
  if (!match) return null;

  const serverSup = support[String(match.id)] || support[match.id] || { home: 0, away: 0 };
  const supHome = Number(serverSup.home || 0) + localTaps.home;
  const supAway = Number(serverSup.away || 0) + localTaps.away;
  const total = supHome + supAway;
  const homePct = total ? Math.round((supHome / total) * 100) : 50;
  const awayPct = 100 - homePct;

  const tap = (side, el) => {
    if (pendingRef.current.matchId !== match.id) {
      pendingRef.current = { matchId: match.id, home: 0, away: 0 };
    }
    pendingRef.current[side] += 1;
    setLocalTaps(t => ({ ...t, [side]: t[side] + 1 }));
    burst(el, side === 'home' ? HOME_COLORS : AWAY_COLORS);
    floatPlusOne(el, side === 'home' ? 'var(--green)' : 'var(--blue)');
  };

  return (
    <div className="match-pulse">
      <button
        type="button"
        className="match-pulse-action"
        onClick={(event) => tap('home', event.currentTarget)}
        title={`Apoyar a ${match.homeTeam}`}
      >
        <FlagIcon team={match.homeTeam} label={match.homeTeam} squared />
        <span>{match.homeTeam}</span>
      </button>

      <div className="match-pulse-center">
        <div className="match-pulse-bar" title={`${supHome} vs ${supAway} apoyos`}>
          <span style={{ width: `${homePct}%` }}>{homePct > 12 ? `${homePct}%` : ''}</span>
          <span style={{ width: `${awayPct}%` }}>{awayPct > 12 ? `${awayPct}%` : ''}</span>
        </div>
        <div className="match-pulse-stats">
          {pred ? (
            <>
              <BarChart3 size={12} />
              <span>{match.homeTeam.slice(0, 3).toUpperCase()} {pred.home}% · X {pred.draw}% · {match.awayTeam.slice(0, 3).toUpperCase()} {pred.away}%</span>
            </>
          ) : (
            <span>Sin pronósticos cargados todavía</span>
          )}
          {onOpenPredictionsForMatch && (
            <button type="button" onClick={() => onOpenPredictionsForMatch(match.id)}>
              Ver pronósticos
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className="match-pulse-action away"
        onClick={(event) => tap('away', event.currentTarget)}
        title={`Apoyar a ${match.awayTeam}`}
      >
        <FlagIcon team={match.awayTeam} label={match.awayTeam} squared />
        <span>{match.awayTeam}</span>
      </button>
    </div>
  );
}
