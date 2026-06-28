import { useMemo, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import LivePulse from './LivePulse';
import PlayerCard from './PlayerCard';
import RankMovement from './RankMovement';
import TeamBadge from './TeamBadge';
import TeamRivalryBar from './TeamRivalryBar';
import { formatPodiumTime } from '../services/podiumTime';
import { getPodiumGroups } from '../services/ranking';

function rankLabel(rank) {
  if (rank === 1) return '1er lugar';
  if (rank === 2) return '2do lugar';
  if (rank === 3) return '3er lugar';
  return `${rank}° lugar`;
}

const PODIUM_REACTIONS = [
  { key: 'bank', icon: '🔥', label: 'Banco' },
  { key: 'suspect', icon: '👀', label: 'Sospechoso' },
  { key: 'salt', icon: '🧂', label: 'Arde' }
];

// Pódium con empates reales: cada lugar (1/2/3) puede tener 1 o varias personas.
const PODIUM_META = {
  1: { medal: '🏆', label: 'I', cls: 'gold' },
  2: { medal: '🥈', label: 'II', cls: 'silver' },
  3: { medal: '🥉', label: 'III', cls: 'bronze' }
};

function Podium({ podiumGroups, onSelect, legend, reactions = {}, onReact }) {
  const triggerReaction = (playerName, reaction) => {
    onReact?.(playerName, reaction);
  };

  const groupsByRank = {
    1: podiumGroups.find(g => g.rank === 1),
    2: podiumGroups.find(g => g.rank === 2),
    3: podiumGroups.find(g => g.rank === 3)
  };

  const renderStep = (group, place) => {
    const meta = PODIUM_META[place];

    if (!group || group.players.length === 0) {
      return <div className={`podium-step ${meta.cls} empty`}><div className="podium-block">{meta.label}</div></div>;
    }

    // Empate: tarjeta compacta con la lista de empatados (cada uno abre su ficha).
    if (group.players.length > 1) {
      return (
        <div className={`podium-step ${meta.cls} tied`}>
          <div className="podium-card podium-card-tied">
            <span className="podium-medal">{meta.medal}</span>
            <span className="podium-tie-label">Empate en {rankLabel(place)}</span>
            <span className="podium-points">{group.points} <small>PTS</small></span>
            <div className="podium-tie-list" aria-label={`Empatados en ${rankLabel(place)}`}>
              {group.players.map(player => (
                <button
                  key={player.name}
                  type="button"
                  className="podium-tie-player"
                  onClick={() => onSelect(player)}
                  title={`Ver ficha de ${player.name}`}
                >
                  {player.photo ? (
                    <span className="podium-tie-avatar has-photo"><img src={player.photo} alt="" /></span>
                  ) : (
                    <span className="podium-tie-avatar">{player.avatar}</span>
                  )}
                  <span className="podium-tie-name">{player.name}</span>
                  <TeamBadge team={player.team} className="podium-tie-team" />
                </button>
              ))}
            </div>
          </div>
          <div className="podium-block">{meta.label}</div>
        </div>
      );
    }

    // Lugar sin empate: tarjeta rica clásica.
    const player = group.players[0];
    const playerReactions = reactions[player.name] || {};

    return (
      <div className={`podium-step ${meta.cls}`}>
        <div
          className="podium-card"
          onClick={() => onSelect(player)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(player); } }}
          title={`Ver ficha de ${player.name}`}
          role="button"
          tabIndex={0}
        >
          <div className="avatar-team-wrap">
            {player.photo ? (
              <div className="podium-avatar has-photo"><img src={player.photo} alt={player.name} /></div>
            ) : (
              <div className="podium-avatar">{player.avatar}</div>
            )}
            <TeamBadge team={player.team} className="on-avatar" />
          </div>
          <span className="podium-medal">{meta.medal}</span>
          <span className="podium-name">{player.name}</span>
          <span className="podium-points">{player.points} <small>PTS</small></span>
          <div className="podium-mini-stats">
            <span title="Marcadores exactos">{player.exactHits} exactos</span>
            <span title="Efectividad">{player.effectiveness}%</span>
          </div>
          {legend?.name === player.name && (
            <span className="podium-legend-tag" title="Más tiempo acumulado en el podio desde el inicio del Mundial">
              🏛️ Leyenda · {formatPodiumTime(legend.totalMs)}
            </span>
          )}
          <div className="podium-reactions" aria-label={`Reacciones al podio de ${player.name}`}>
            {PODIUM_REACTIONS.map(r => (
              <button
                key={r.key}
                type="button"
                className={`podium-reaction-btn reaction-${r.key}`}
                onClick={(event) => {
                  event.stopPropagation();
                  triggerReaction(player.name, r.key);
                }}
                title={`${r.label} a ${player.name}`}
                aria-label={`${r.label} a ${player.name}`}
              >
                <span aria-hidden="true">{r.icon}</span>
                <small>{Number(playerReactions[r.key] || 0)}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="podium-block">{meta.label}</div>
      </div>
    );
  };

  return (
    <section className="podium-section">
      <div className="podium-heading">
        <h2><Trophy size={22} className="trophy-gold" /> Líderes de la Oficina</h2>
        <p>Copa Mundial FIFA 26 · Termómetro del podio abierto</p>
      </div>
      <div className="podium-row">
        {renderStep(groupsByRank[2], 2)}
        {renderStep(groupsByRank[1], 1)}
        {renderStep(groupsByRank[3], 3)}
      </div>
    </section>
  );
}

export default function Dashboard({ standings, matches = [], chatMessages = [], support = {}, podiumReactions = {}, movement = {}, podiumMs = {}, legend = null, onSendMessage, onReaction, onPodiumReaction, onOpenPredictionsForMatch, dashboardMode = 'rh_current', dashboardTitle, onGoNewQuiniela }) {
  // En Nueva Quiniela nadie entra al podio hasta que haya puntos reales (>0):
  // si todos están en 0, el podio queda vacío (placeholders) en vez de empatar a todos en 1º.
  const podiumEligibleStandings = useMemo(() => {
    if (dashboardMode !== 'new_quiniela') return standings;
    return standings.filter(player => Number(player.points || 0) > 0);
  }, [dashboardMode, standings]);

  const podiumGroups = useMemo(() => getPodiumGroups(podiumEligibleStandings, 3), [podiumEligibleStandings]);
  const podiumNames = useMemo(
    () => new Set(podiumGroups.flatMap(g => g.players.map(p => p.name))),
    [podiumGroups]
  );
  const [selected, setSelected] = useState(null);
  const [pulseOpen, setPulseOpen] = useState(true);

  const openCard = (player) => {
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelected({ player, todayKey });
  };

  const showPulse = dashboardMode !== 'rh_archive';

  return (
    <div className="command-grid">
      <Podium podiumGroups={podiumGroups} onSelect={openCard} legend={legend} reactions={podiumReactions} onReact={onPodiumReaction} />

      {showPulse && (
        <div className="pulse-panel-wrapper">
          <button
            type="button"
            className="pulse-collapse-toggle"
            onClick={() => setPulseOpen(o => !o)}
            aria-expanded={pulseOpen}
            aria-label={pulseOpen ? 'Ocultar pulso en vivo' : 'Mostrar pulso en vivo'}
          >
            <span>⚡ Pulso en vivo</span>
            <span className="pulse-toggle-caret">{pulseOpen ? '▲' : '▼'}</span>
          </button>
          {pulseOpen && (
            <LivePulse
              matches={matches}
              participants={standings}
              support={support}
              chatMessages={chatMessages}
              onSendMessage={onSendMessage}
              onReaction={onReaction}
              onOpenPredictionsForMatch={onOpenPredictionsForMatch}
            />
          )}
        </div>
      )}

      <div className="command-right">
        <TeamRivalryBar standings={standings} />
        <div className="page-card standings-card">
        <div className="standings-table-header">
          <h3 className="section-title">
            <Medal size={20} />
            {dashboardTitle || 'Tabla General de Posiciones'}
          </h3>
          <span className="standings-participants-count">{standings.length} participantes</span>
        </div>

        {dashboardMode === 'new_quiniela' && standings.length === 0 && (
          <div className="dashboard-empty-state">
            <p>La Nueva Quiniela todavía no tiene registros aprobados.</p>
            <p>Cuando el admin apruebe pronósticos, aparecerá aquí la tabla general.</p>
            {onGoNewQuiniela && (
              <button className="phase-submit-btn secondary" onClick={onGoNewQuiniela}>Ir a Nueva Quiniela</button>
            )}
          </div>
        )}

        <div className="standings-table-container">
          <table className="standings-table">
            <thead>
              <tr>
                <th className="th-center" style={{ width: '56px' }}>Pos</th>
                <th>Participante</th>
                <th className="th-center" title="Partidos jugados con pronóstico">Partidos</th>
                <th className="th-center" title="Marcador exacto (+3 pts)">Exactos</th>
                <th className="th-center" title="Acertó ganador o empate (+1 pt)">Resultados</th>
                <th className="th-center" title="Porcentaje de aciertos">Efectividad</th>
                <th className="th-center" style={{ width: '90px' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((p) => {
                const isTopThree = p.rank <= 3;
                return (
                  <tr
                    key={p.name}
                    className={`standings-row is-clickable ${isTopThree ? `top-${p.rank}` : ''}`}
                    onClick={() => openCard(p)}
                    tabIndex={0}
                    aria-label={`Ver ficha de ${p.name}`}
                    title={`Ver ficha de ${p.name}`}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCard(p); } }}
                  >
                    <td className="standings-rank-cell">
                      <div className={`rank-badge rank-${p.rank <= 3 ? p.rank : 'rest'}`}>{p.rank}</div>
                      <RankMovement delta={movement[p.name]} className="standings-move" />
                    </td>
                    <td>
                      <div className="standings-user-profile">
                        <TeamBadge team={p.team} className="standings-between" />
                        {p.photo ? (
                          <div className="standings-avatar has-photo"><img src={p.photo} alt={p.name} /></div>
                        ) : (
                          <div className="standings-avatar">{p.avatar}</div>
                        )}
                        <div className="standings-name-wrapper">
                          <span className="standings-user-name">{p.name}</span>
                          <span className="standings-tags">
                            {isTopThree && (
                              <span className="standings-badge-tag">
                                {p.rank === 1 ? 'Líder' : p.rank === 2 ? 'Sublíder' : 'Podio'}
                              </span>
                            )}
                            {legend?.name === p.name && (
                              <span className="standings-legend-chip" title={`Leyenda del Podio · ${formatPodiumTime(podiumMs[p.name] || 0)} en el podio`}>🏛️ Leyenda</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="th-center cell-strong">{p.playedAndPredicted}</td>
                    <td className="th-center">
                      <span className="count-badge exact-count">{p.exactHits}</span>
                    </td>
                    <td className="th-center">
                      <span className="count-badge outcome-count">{p.outcomeHits}</span>
                    </td>
                    <td className="th-center">
                      <div className="effectiveness-cell">
                        <span className="effectiveness-percentage">{p.effectiveness}%</span>
                        <div className="effectiveness-bar-bg">
                          <div
                            className="effectiveness-bar-fill"
                            style={{ width: `${p.effectiveness}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="th-center">
                      <div className="standings-points-cell">{p.points}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {selected && (
        <PlayerCard
          player={selected.player}
          matches={matches}
          totalParticipants={standings.length}
          todayKey={selected.todayKey}
          rankDelta={movement[selected.player.name]}
          podiumMs={podiumMs[selected.player.name] || 0}
          isLegend={legend?.name === selected.player.name}
          accruingPodium={podiumNames.has(selected.player.name)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
