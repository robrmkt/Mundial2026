import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { fetchCapitalHumanoArchive } from '../services/predictionWindows';

export default function CapitalHumanoArchive({ initialArchive = null, fallbackStandings = [], onGoNew }) {
  const [archive, setArchive] = useState(initialArchive);

  useEffect(() => {
    fetchCapitalHumanoArchive().then(d => setArchive(d.archive || null)).catch(() => {});
  }, []);

  const standings = archive?.standings?.length ? archive.standings : fallbackStandings;
  const podium = archive?.podium?.length ? archive.podium : standings.slice(0, 3);

  return (
    <section className="archive-page">
      <div className="archive-hero">
        <span className="archive-status">Histórico cerrado</span>
        <h2>{archive?.title || 'Quiniela Capital Humano · Fase de grupos'}</h2>
        <p>La dinámica organizada por Capital Humano cerró con la fase de grupos. Esta vista es una fotografía histórica y ya no se mueve.</p>
        {archive?.frozenAt && <small>Congelado: {new Date(archive.frozenAt).toLocaleString('es-MX')}</small>}
        <button className="phase-submit-btn" onClick={onGoNew}>Ir a nueva quiniela</button>
      </div>

      <div className="archive-podium">
        <h3><Trophy size={18} /> Podio final</h3>
        <div className="archive-podium-row">
          {podium.map((p, index) => (
            <div key={p.name || index} className="archive-podium-card">
              <span>{index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}</span>
              <strong>{p.name}</strong>
              <small>{p.points || 0} pts · {p.exactHits || 0} exactos</small>
            </div>
          ))}
        </div>
      </div>

      <div className="archive-table-card">
        <h3><Medal size={18} /> Tabla final congelada</h3>
        <div className="standings-table-container">
          <table className="standings-table">
            <thead><tr><th>Pos</th><th>Participante</th><th>Exactos</th><th>Resultados</th><th>Puntos</th></tr></thead>
            <tbody>
              {standings.map((p, idx) => (
                <tr key={p.name || idx}>
                  <td>#{p.rank || idx + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.exactHits || 0}</td>
                  <td>{p.outcomeHits || 0}</td>
                  <td><strong>{p.points || 0}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
