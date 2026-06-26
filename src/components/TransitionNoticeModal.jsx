import { dismissTransitionNotice } from '../services/transitionNotice';

export default function TransitionNoticeModal({ settings, onClose, onArchive, onNew }) {
  const version = settings?.transitionNoticeVersion || 1;
  const close = () => {
    dismissTransitionNotice(version);
    onClose?.();
  };
  return (
    <div className="transition-notice-overlay">
      <div className="transition-notice">
        <span className="section-kicker">Cambio de etapa</span>
        <h2>La quiniela de Capital Humano ya terminó</h2>
        <p>La dinámica organizada por Capital Humano cerró con la fase de grupos.</p>
        <p>Sus resultados quedan guardados como histórico y ya no se moverán.</p>
        <p>A partir de ahora, esta plataforma continúa con una nueva quiniela para quienes quieran seguir pronosticando los siguientes partidos.</p>
        <div className="transition-actions">
          <button className="phase-submit-btn" onClick={() => { close(); onArchive?.(); }}>Ver histórico Capital Humano</button>
          <button className="phase-submit-btn secondary" onClick={() => { close(); onNew?.(); }}>Ir a nueva quiniela</button>
          <button className="phase-back-btn" onClick={close}>Entendido</button>
        </div>
      </div>
    </div>
  );
}
