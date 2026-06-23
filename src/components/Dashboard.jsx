import { useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import LivePulse from './LivePulse';
import PlayerCard from './PlayerCard';
import RankMovement from './RankMovement';
import { formatPodiumTime } from '../services/podiumTime';

const PODIUM_REACTIONS = [
  { key: 'bank', icon: '🔥', label: 'Banco' },
  { key: 'suspect', icon: '👀', label: 'Sospechoso' },
  { key: 'salt', icon: '🧂', label: 'Arde' }
];

// Pódium de los tres primeros lugares
function Podium({ topThree, onSelect, legend, reactions = {}, onReact }) {
  const [first, second, third] = topThree;

  const renderStep = (player, place) => {
    const meta = {
      1: { medal: '🏆', label: 'I', cls: 'gold' },
      2: { medal: '🥈', label: 'II', cls: 'silver' },
      3: { medal: '🥉', label: 'III', cls: 'bronze' }
    }[place];

    if (!player) {
      return <div className={`podium-step ${meta.cls} empty`}><div className="podium-block">{meta.label}</div></div>;
    }

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
          {player.photo ? (
            <div className="podium-avatar has-photo"><img src={player.photo} alt={player.name} /></div>
          ) : (
            <div className="podium-avatar">{player.avatar}</div>
          )}
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
                  onReact?.(player.name, r.key);
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
        {renderStep(second, 2)}
        {renderStep(first, 1)}
        {renderStep(third, 3)}
      </div>
    </section>
  );
}

export default function Dashboard({ standings, matches = [], chatMessages = [], support = {}, podiumReactions = {}, movement = {}, podiumMs = {}, legend = null, onSendMessage, onReaction, onPodiumReaction, onOpenPredictionsForMatch }) {
  const topThree = standings.slice(0, 3);
  const [selected, setSelected] = useState(null);

  const openCard = (player) => {
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelected({ player, todayKey });
  };

  return (
    <div className="command-grid">
      <Podium topThree={topThree} onSelect={openCard} legend={legend} reactions={podiumReactions} onReact={onPodiumReaction} />

      <LivePulse
        matches={matches}
        participants={standings}
        support={support}
        chatMessages={chatMessages}
        onSendMessage={onSendMessage}
        onReaction={onReaction}
        onOpenPredictionsForMatch={onOpenPredictionsForMatch}
      />

      <div className="command-right">
        <div className="page-card standings-card">
        <div className="standings-table-header">
          <h3 className="section-title">
            <Medal size={20} />
            Tabla General de Posiciones
          </h3>
          <span className="standings-participants-count">{standings.length} participantes</span>
        </div>

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
          accruingPodium={standings.slice(0, 3).some(p => p.name === selected.player.name)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
