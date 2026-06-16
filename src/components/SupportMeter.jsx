// "Pulso de la oficina": para el partido en vivo (o el próximo) muestra el
// reparto REAL según los pronósticos + el "cariño" de la oficina (taps de apoyo).
// Apoyar/Buuu van a EQUIPOS, nunca a compañeros. Taps agrupados cada 500 ms.
import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { postSupport, postBoo } from '../services/sharedEvents';

const HOME_COLORS = ['#0E7C4A', '#ffffff', '#D7282F'];
const AWAY_COLORS = ['#1D4ED8', '#ffffff', '#85B7EB'];

// El apoyo se SIENTE: cada apretón al balón lanza confeti (regulado) + un "+1".
let lastBurstAt = 0;
function cheerBurst(el, colors) {
  if (typeof confetti !== 'function' || !el) return;
  const now = Date.now();
  if (now - lastBurstAt < 130) return; // evita saturar con taps muy rápidos
  lastBurstAt = now;
  const r = el.getBoundingClientRect();
  confetti({
    particleCount: 22,
    spread: 55,
    startVelocity: 26,
    scalar: 0.8,
    ticks: 90,
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
  span.className = 'sup-plus';
  span.textContent = '+1';
  span.style.left = `${r.left + r.width / 2}px`;
  span.style.top = `${r.top}px`;
  span.style.color = color;
  document.body.appendChild(span);
  setTimeout(() => span.remove(), 750);
}

const BOO_WORDS = ['¡buuu!', 'buuu', '¡buuu!'];
// Abucheo: fantasmitas que suben + palabras "buuu" flotando.
function booFx(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  BOO_WORDS.forEach((txt, i) => {
    const s = document.createElement('span');
    s.className = 'sup-boo-word';
    s.textContent = txt;
    s.style.left = `${cx + (i - 1) * 26}px`;
    s.style.top = `${r.top}px`;
    s.style.animationDelay = `${i * 0.09}s`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1050);
  });
  for (let i = 0; i < 3; i++) {
    const g = document.createElement('span');
    g.className = 'sup-ghost';
    g.textContent = '👻';
    g.style.left = `${cx + (Math.random() * 70 - 35)}px`;
    g.style.top = `${r.top}px`;
    g.style.animationDelay = `${Math.random() * 0.25}s`;
    document.body.appendChild(g);
    setTimeout(() => g.remove(), 1300);
  }
}

function predictionSplit(standings, matchId) {
  let home = 0, draw = 0, away = 0, total = 0;
  standings.forEach(p => {
    const pred = (p.predictions || {})[matchId];
    if (!pred) return;
    const h = Number(pred.homeScore);
    const a = Number(pred.awayScore);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    total++;
    if (h > a) home++;
    else if (h < a) away++;
    else draw++;
  });
  if (!total) return null;
  return {
    home: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    away: Math.round((away / total) * 100),
    total
  };
}

export default function SupportMeter({ matches = [], standings = [], support = {} }) {
  const match = useMemo(() => {
    const live = matches.find(m => m.status === 'LIVE');
    if (live) return live;
    return matches
      .filter(m => m.status === 'SCHEDULED' && m.kickoff)
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0] || null;
  }, [matches]);

  const [localTaps, setLocalTaps] = useState({ home: 0, away: 0 });
  const [trackedId, setTrackedId] = useState(match?.id);
  const pendingRef = useRef({ matchId: match?.id, home: 0, away: 0 });

  // Reset de taps al cambiar de partido (ajuste de estado en render, sin effect).
  if (match?.id !== trackedId) {
    setTrackedId(match?.id);
    setLocalTaps({ home: 0, away: 0 });
  }

  // Anti-spam: agrupa los taps y los envía cada 500 ms (al partido que los originó).
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

  if (!match) return null;

  const pred = predictionSplit(standings, match.id);
  const serverSup = support[match.id] || { home: 0, away: 0 };
  const supHome = (serverSup.home || 0) + localTaps.home;
  const supAway = (serverSup.away || 0) + localTaps.away;
  const supTotal = supHome + supAway;
  const officeHome = supTotal ? Math.round((supHome / supTotal) * 100) : 50;
  const officeAway = 100 - officeHome;
  const isLive = match.status === 'LIVE';

  const tap = (side, el) => {
    if (pendingRef.current.matchId !== match.id) {
      pendingRef.current = { matchId: match.id, home: 0, away: 0 };
    }
    pendingRef.current[side] += 1;
    setLocalTaps(t => ({ ...t, [side]: t[side] + 1 }));
    const colors = side === 'home' ? HOME_COLORS : AWAY_COLORS;
    cheerBurst(el, colors);
    floatPlusOne(el, side === 'home' ? 'var(--green)' : 'var(--blue)');
  };
  const boo = (side) => {
    postBoo({ matchId: match.id, team: side === 'home' ? match.homeTeam : match.awayTeam });
  };

  return (
    <div className="support-meter page-card">
      <div className="support-head">
        <span className="support-title">📣 Pulso de la oficina</span>
        <span className={`support-match ${isLive ? 'is-live' : ''}`}>
          {isLive && <span className="live-dot" />}
          {isLive ? 'EN VIVO' : 'PRÓXIMO'} · {match.homeFlag} {match.homeTeam} vs {match.awayTeam} {match.awayFlag}
        </span>
      </div>

      {pred && (
        <div className="support-line">
          <span className="support-label">Según quinielas</span>
          <span className="support-pred">{match.homeTeam} {pred.home}% · Empate {pred.draw}% · {match.awayTeam} {pred.away}%</span>
        </div>
      )}

      <div className="support-line">
        <span className="support-label">Cariño de la oficina</span>
        <div className="support-bar" title={`${supHome} vs ${supAway} apoyos`}>
          <div className="support-bar-home" style={{ width: `${officeHome}%` }}>{officeHome > 12 ? `${officeHome}%` : ''}</div>
          <div className="support-bar-away" style={{ width: `${officeAway}%` }}>{officeAway > 12 ? `${officeAway}%` : ''}</div>
        </div>
      </div>

      <div className="support-actions">
        <div className="support-team">
          <span className="support-team-name">{match.homeFlag} {match.homeTeam}</span>
          <div className="sup-controls">
            <button
              className="sup-ball"
              onClick={(e) => tap('home', e.currentTarget)}
              aria-label={`Apoyar a ${match.homeTeam}`}
              title="¡Aprieta el balón para apoyar!"
            >
              <span className="sup-ball-emoji">⚽</span>
            </button>
            <button
              className="sup-boo"
              onClick={(e) => { boo('home'); booFx(e.currentTarget); }}
              aria-label={`Abuchear a ${match.homeTeam}`}
              title="¡Abuchear!"
            >👻</button>
          </div>
        </div>
        <div className="support-team">
          <span className="support-team-name">{match.awayFlag} {match.awayTeam}</span>
          <div className="sup-controls">
            <button
              className="sup-ball"
              onClick={(e) => tap('away', e.currentTarget)}
              aria-label={`Apoyar a ${match.awayTeam}`}
              title="¡Aprieta el balón para apoyar!"
            >
              <span className="sup-ball-emoji">⚽</span>
            </button>
            <button
              className="sup-boo"
              onClick={(e) => { boo('away'); booFx(e.currentTarget); }}
              aria-label={`Abuchear a ${match.awayTeam}`}
              title="¡Abuchear!"
            >👻</button>
          </div>
        </div>
      </div>
    </div>
  );
}
