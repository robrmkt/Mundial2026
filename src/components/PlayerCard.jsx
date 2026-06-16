import { useEffect, useMemo, useRef } from 'react';
import { X, Target, Crosshair, XCircle } from 'lucide-react';
import { getPlayerProfile } from '../services/playerRoles';
import { evaluateBadges } from '../services/achievements';
import LuckButton from './LuckButton';
import BadgeShelf from './BadgeShelf';
import RankMovement from './RankMovement';
import SharePlayerCardButton from './SharePlayerCardButton';
import { formatPodiumTime } from '../services/podiumTime';

function EfficiencyRing({ value }) {
  const eff = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (eff / 100) * circumference;
  return (
    <div className="eff-ring">
      <svg viewBox="0 0 80 80" width="80" height="80">
        <circle cx="40" cy="40" r={radius} className="eff-ring-bg" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="eff-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="eff-ring-label">
        <strong>{eff}%</strong>
        <span>efectividad</span>
      </div>
    </div>
  );
}

export default function PlayerCard({ player, matches, totalParticipants, todayKey, rankDelta, podiumMs = 0, isLegend = false, onClose }) {
  const dialogRef = useRef(null);

  // Modal accesible: enfoca al abrir, atrapa el Tab, y devuelve el foco al cerrar.
  useEffect(() => {
    const previousFocus = document.activeElement;
    const node = dialogRef.current;
    node?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !node) return;
      const focusables = node.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (focusables.length === 0) { event.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    node?.addEventListener('keydown', onKey);
    return () => {
      node?.removeEventListener('keydown', onKey);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [onClose]);

  const profile = useMemo(
    () => getPlayerProfile(player, matches, totalParticipants, todayKey, { rankDelta, isLegend }),
    [player, matches, totalParticipants, todayKey, rankDelta, isLegend]
  );

  const { role, recent, misses, today } = profile;

  const badges = useMemo(
    () => evaluateBadges(player, profile, { matches, totalParticipants, ctx: { rankDelta, podiumMs, isLegend } }),
    [player, profile, matches, totalParticipants, rankDelta, podiumMs, isLegend]
  );

  return (
    <div className="sticker-overlay" onClick={onClose}>
      <div
        className={`player-sticker accent-${role.accent}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${player.name}`}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="sticker-foil" aria-hidden="true" />
        <div className="sticker-shine" aria-hidden="true" />

        <button className="sticker-close no-export" onClick={onClose} aria-label="Cerrar ficha"><X size={18} /></button>

        <div className="sticker-rank">
          #{player.rank}
          <RankMovement delta={rankDelta} className="sticker-move" />
        </div>

        <div className="sticker-photo">
          {player.photo ? (
            <img src={player.photo} alt={player.name} />
          ) : (
            <div className="sticker-photo-fallback">{player.avatar}</div>
          )}
          <div className="sticker-role-emoji" title={role.title}>{role.emoji}</div>
        </div>

        <div className="sticker-identity">
          <span className="sticker-name">{player.name}</span>
          <span className="sticker-role">{role.title}</span>
          <span className="sticker-tagline">{role.tagline}</span>
        </div>

        {today.flair && (
          <div className={`sticker-flair flair-${today.flair.tone}`}>{today.flair.text}</div>
        )}

        <div className="sticker-stats">
          <EfficiencyRing value={player.effectiveness} />
          <div className="sticker-chips">
            <div className="stat-chip chip-exact">
              <Target size={14} />
              <strong>{player.exactHits}</strong>
              <span>exactos</span>
            </div>
            <div className="stat-chip chip-outcome">
              <Crosshair size={14} />
              <strong>{player.outcomeHits}</strong>
              <span>resultados</span>
            </div>
            <div className="stat-chip chip-miss">
              <XCircle size={14} />
              <strong>{misses}</strong>
              <span>fallados</span>
            </div>
          </div>
        </div>

        <div className="sticker-recent">
          <span className="sticker-recent-label">Últimos partidos</span>
          <div className="sticker-dots">
            {recent.length === 0 ? (
              <span className="sticker-recent-empty">Sin partidos jugados aún</span>
            ) : (
              recent.map(r => (
                <span
                  key={r.matchId}
                  className={`recent-dot dot-${r.kind}`}
                  title={`${r.homeFlag} ${r.home} ${r.actual} ${r.away} ${r.awayFlag} · tu pronóstico ${r.pred}`}
                />
              ))
            )}
          </div>
        </div>

        {podiumMs > 0 && (
          <div className="sticker-podium-time">
            🏛️ Tiempo en podio: <strong>{formatPodiumTime(podiumMs)}</strong>
            {isLegend && <span className="legend-tag">Leyenda</span>}
          </div>
        )}

        <BadgeShelf badges={badges} />

        <div className="sticker-actions no-export">
          <LuckButton targetName={player.name} />
        </div>

        <SharePlayerCardButton cardRef={dialogRef} name={player.name} />

        <div className="sticker-footer">
          <span className="sticker-points-label">Puntos totales</span>
          <span className="sticker-points">{player.points}</span>
        </div>
      </div>
    </div>
  );
}
