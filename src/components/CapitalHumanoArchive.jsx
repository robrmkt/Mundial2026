import { useEffect, useState } from 'react';
import Dashboard from './Dashboard';
import { fetchCapitalHumanoArchive } from '../services/predictionWindows';

// Vista histórica de la Quiniela RH: reutiliza el tablero con datos guardados
// del cierre y se mantiene en modo solo lectura.
export default function CapitalHumanoArchive({ initialArchive = null, fallbackStandings = [], onGoNew }) {
  const [archive, setArchive] = useState(initialArchive);

  useEffect(() => {
    fetchCapitalHumanoArchive().then(d => setArchive(d.archive || null)).catch(() => {});
  }, []);

  const frozenStandings = archive?.standings?.length ? archive.standings : fallbackStandings;
  const frozenMatches = Array.isArray(archive?.matches) ? archive.matches : [];

  if (!frozenStandings.length) {
    return (
      <section className="archive-page">
        <div className="archive-hero">
          <span className="archive-status">Quiniela RH</span>
          <h2>Quiniela RH · Fase de grupos</h2>
          <p>El histórico RH todavía no ha sido cerrado.</p>
          <button className="phase-submit-btn" onClick={onGoNew}>Ir a Nueva Quiniela</button>
        </div>
      </section>
    );
  }

  return (
    <section className="archive-page archive-dashboard-page">
      <div className="archive-hero">
        <span className="archive-status">Histórico RH</span>
        <h2>{archive?.title || 'Quiniela RH · Fase de grupos'}</h2>
        <p>Tabla final de la Quiniela RH. Esta vista conserva el cierre de la fase de grupos.</p>
        {archive?.frozenAt && (
          <small>Congelado: {new Date(archive.frozenAt).toLocaleString('es-MX')}</small>
        )}
        <button className="phase-submit-btn" onClick={onGoNew}>Ir a Nueva Quiniela</button>
      </div>

      <Dashboard
        standings={frozenStandings}
        matches={frozenMatches}
        chatMessages={[]}
        support={{}}
        podiumReactions={{}}
        movement={{}}
        podiumMs={{}}
        legend={null}
        onSendMessage={() => {}}
        onReaction={() => {}}
        onPodiumReaction={() => {}}
        onOpenPredictionsForMatch={() => {}}
        dashboardMode="rh_archive"
        dashboardTitle="Tabla Final · Quiniela RH"
        onGoNewQuiniela={onGoNew}
      />
    </section>
  );
}
