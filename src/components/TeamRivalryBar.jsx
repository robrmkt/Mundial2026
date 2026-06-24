import { useState } from 'react';
import confetti from 'canvas-confetti';
import { TEAMS } from './TeamBadge';

const BZ_COLORS = ['#D7282F', '#A1121B', '#ffffff', '#F87171'];
const UP_COLORS = ['#1D4ED8', '#2563EB', '#85B7EB', '#ffffff'];

function fireTeamConfetti(team, originEl) {
  const rect = originEl?.getBoundingClientRect();
  const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
  const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.6;
  const colors = team === 'bz' ? BZ_COLORS : UP_COLORS;
  confetti({ particleCount: 60, spread: 80, origin: { x, y }, colors, disableForReducedMotion: true });
  confetti({ particleCount: 30, spread: 50, angle: team === 'bz' ? 60 : 120, origin: { x, y }, colors, disableForReducedMotion: true });
}

function getRivalryHeadline(stats) {
  const top10 = Math.min(10, stats.bz.count + stats.up.count);
  if (stats.bz.top10 > stats.up.top10) return `BZ domina el Top ${top10}: ${stats.bz.top10} de ${top10} lugares`;
  if (stats.up.top10 > stats.bz.top10) return `UP domina el Top ${top10}: ${stats.up.top10} de ${top10} lugares`;
  if (stats.bz.avgPoints > stats.up.avgPoints) return 'BZ toma ventaja por promedio';
  if (stats.up.avgPoints > stats.bz.avgPoints) return 'UP toma ventaja por promedio';
  return 'Empate técnico en el derbi interno';
}

export default function TeamRivalryBar({ standings }) {
  const [shake, setShake] = useState(null);

  const bz = standings.filter(p => p.team === 'bz');
  const up = standings.filter(p => p.team === 'up');

  if (bz.length === 0 || up.length === 0) return null;

  const bzAvg = bz.reduce((s, p) => s + p.points, 0) / bz.length;
  const upAvg = up.reduce((s, p) => s + p.points, 0) / up.length;
  const total = bzAvg + upAvg;
  const bzPct = total > 0 ? Math.round((bzAvg / total) * 100) : 50;
  const upPct = 100 - bzPct;

  const top10ids = new Set(standings.slice(0, 10).map(p => p.name));
  const stats = {
    bz: {
      count: bz.length,
      avgPoints: bzAvg,
      top10: bz.filter(p => top10ids.has(p.name)).length,
      top3: bz.filter(p => p.rank <= 3).length,
      exactHits: bz.reduce((s, p) => s + p.exactHits, 0),
      best: bz.reduce((a, b) => b.points > a.points ? b : a, bz[0]),
    },
    up: {
      count: up.length,
      avgPoints: upAvg,
      top10: up.filter(p => top10ids.has(p.name)).length,
      top3: up.filter(p => p.rank <= 3).length,
      exactHits: up.reduce((s, p) => s + p.exactHits, 0),
      best: up.reduce((a, b) => b.points > a.points ? b : a, up[0]),
    },
  };

  const headline = getRivalryHeadline(stats);
  const bzLeads = bzPct > upPct;
  const tied = bzPct === upPct;

  const handleTap = (team, event) => {
    fireTeamConfetti(team, event.currentTarget);
    setShake(team);
    setTimeout(() => setShake(null), 600);
  };

  return (
    <div className="rivalry-bar-card">
      <div className="rivalry-bar-title">🔥 Derbi interno</div>

      <div className="rivalry-bar-main">
        <button
          className={`rivalry-shield-btn${shake === 'bz' ? ' shake' : ''}`}
          onClick={(e) => handleTap('bz', e)}
          aria-label="Porra Team BZ"
          title="¡Vamos BZ!"
        >
          <img src={TEAMS.bz.src} alt="Team BZ" className="rivalry-shield-img" />
          <span className="rivalry-team-label bz">BZ</span>
        </button>

        <div className="rivalry-bar-center">
          <div className="rivalry-pct-row">
            <span className={`rivalry-pct${bzLeads ? ' leads' : ''}`}>{bzPct}%</span>
            <div className="rivalry-track">
              <div className="rivalry-fill bz-fill" style={{ width: `${bzPct}%` }} />
              <div className="rivalry-fill up-fill" style={{ width: `${upPct}%` }} />
            </div>
            <span className={`rivalry-pct${!bzLeads && !tied ? ' leads' : ''}`}>{upPct}%</span>
          </div>
          <div className="rivalry-headline">{headline}</div>
          <div className="rivalry-avg-row">
            <span>Promedio: <strong>BZ {bzAvg.toFixed(1)} pts</strong> · <strong>UP {upAvg.toFixed(1)} pts</strong></span>
          </div>
        </div>

        <button
          className={`rivalry-shield-btn${shake === 'up' ? ' shake' : ''}`}
          onClick={(e) => handleTap('up', e)}
          aria-label="Porra Team UP"
          title="¡Vamos UP!"
        >
          <img src={TEAMS.up.src} alt="Team UP" className="rivalry-shield-img" />
          <span className="rivalry-team-label up">UP</span>
        </button>
      </div>
    </div>
  );
}
