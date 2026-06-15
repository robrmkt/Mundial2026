import { Trophy, Medal, Radio } from 'lucide-react';

// Franja superior con los partidos en vivo / recién terminados
function LiveTicker({ matches }) {
  const interesting = matches.filter(m => m.status === 'LIVE');
  if (interesting.length === 0) return null;

  return (
    <div className="live-ticker">
      <span className="live-ticker-label">
        <Radio size={14} />
        En vivo
      </span>
      <div className="live-ticker-track">
        {interesting.map(m => (
          <div key={m.id} className="ticker-card">
            <span className="ticker-minute">
              <span className="live-dot" />
              {m.isHalftime ? 'MT' : (m.displayClock || `${m.minute}'`)}
            </span>
            <span className="ticker-team">
              {m.homeLogo ? <img src={m.homeLogo} alt="" /> : m.homeFlag} {m.homeTeam}
            </span>
            <strong className="ticker-score">{m.homeScore} - {m.awayScore}</strong>
            <span className="ticker-team">
              {m.awayTeam} {m.awayLogo ? <img src={m.awayLogo} alt="" /> : m.awayFlag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pódium de los tres primeros lugares
function Podium({ topThree }) {
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

    return (
      <div className={`podium-step ${meta.cls}`}>
        <div className="podium-card">
          <span className="podium-medal">{meta.medal}</span>
          <div className="podium-avatar">{player.avatar}</div>
          <span className="podium-name">{player.name}</span>
          <span className="podium-points">{player.points} <small>PTS</small></span>
          <div className="podium-mini-stats">
            <span title="Marcadores exactos">{player.exactHits} exactos</span>
            <span title="Efectividad">{player.effectiveness}%</span>
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
        <p>Copa Mundial FIFA 26 · Canadá · México · Estados Unidos</p>
      </div>
      <div className="podium-row">
        {renderStep(second, 2)}
        {renderStep(first, 1)}
        {renderStep(third, 3)}
      </div>
    </section>
  );
}

export default function Dashboard({ standings, matches = [] }) {
  const topThree = standings.slice(0, 3);

  return (
    <div className="dashboard-layout">
      <LiveTicker matches={matches} />
      <Podium topThree={topThree} />

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
                  <tr key={p.name} className={`standings-row ${isTopThree ? `top-${p.rank}` : ''}`}>
                    <td className="standings-rank-cell">
                      <div className={`rank-badge rank-${p.rank <= 3 ? p.rank : 'rest'}`}>{p.rank}</div>
                    </td>
                    <td>
                      <div className="standings-user-profile">
                        <div className="standings-avatar">{p.avatar}</div>
                        <div className="standings-name-wrapper">
                          <span className="standings-user-name">{p.name}</span>
                          {isTopThree && (
                            <span className="standings-badge-tag">
                              {p.rank === 1 ? 'Líder' : p.rank === 2 ? 'Sublíder' : 'Podio'}
                            </span>
                          )}
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
  );
}
