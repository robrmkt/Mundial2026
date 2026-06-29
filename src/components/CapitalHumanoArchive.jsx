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
        <div className="rh-archive-hero">
          <span className="rh-archive-kicker">Quiniela RH</span>
          <h2 className="rh-archive-title">Quiniela RH · Fase de grupos</h2>
          <p className="rh-archive-message">El histórico RH todavía no ha sido cerrado por el administrador.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="archive-page archive-dashboard-page">
      <div className="rh-archive-hero">
        <span className="rh-archive-kicker">Quiniela RH anterior</span>
        <h2 className="rh-archive-title">Resultados Quiniela RH anterior</h2>
        <p className="rh-archive-message">
          Esta tabla corresponde a la Quiniela RH de fase de grupos. Ya está cerrada y no se mezcla con la Nueva Quiniela.<br />
          <strong>Estos resultados no se borraron</strong>: aquí puedes consultar la tabla final de RH.
        </p>
        {archive?.frozenAt && (
          <small className="rh-archive-date">Cerrado el {new Date(archive.frozenAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</small>
        )}
        {onGoNew && (
          <button className="rh-archive-back-btn" onClick={onGoNew} type="button">
            Volver a Nueva Tabla
          </button>
        )}
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
        dashboardTitle="Resultados Quiniela RH anterior"
        dashboardSubtitle="Tabla final cerrada de la Quiniela RH."
        onGoNewQuiniela={onGoNew}
      />
    </section>
  );
}
