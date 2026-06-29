import { useMemo, useState } from 'react';
import { Info, Trophy, X } from 'lucide-react';
import { readPhaseEducationState, writePhaseEducationState, PHASE_EDUCATION_VERSION } from '../services/phaseEducationState';

// Cintillo persistente (no interruptivo) que explica que estás en la Nueva Quiniela
// y que la Quiniela RH anterior no se borró. Se puede cerrar y recuerda el estado.
// variant: 'full' (dashboard) | 'compact' (pronósticos / nueva quiniela).
export default function PhaseEducationBanner({ variant = 'full', onGoRh, storageScope = 'dashboard' }) {
  const key = `phase_education_v${PHASE_EDUCATION_VERSION}_banner_${storageScope}`;
  const [dismissed, setDismissed] = useState(() => Boolean(readPhaseEducationState(key)?.dismissed));

  const dismiss = () => {
    writePhaseEducationState(key, { dismissed: true, at: new Date().toISOString() });
    setDismissed(true);
  };

  if (dismissed) return null;

  if (variant === 'compact') {
    return (
      <div className="phase-education-banner compact">
        <div className="phase-education-copy">
          <span className="phase-education-text">
            <strong>Nueva fase activa.</strong> La Quiniela RH anterior sigue guardada en Resultados RH.
          </span>
        </div>
        <div className="phase-education-actions">
          {onGoRh && (
            <button className="phase-education-rh-btn" onClick={onGoRh} type="button">
              <Trophy size={13} /> Ver RH anterior
            </button>
          )}
          <button className="phase-education-dismiss" onClick={dismiss} type="button" aria-label="Cerrar aviso">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="phase-education-banner">
      <div className="phase-education-copy">
        <span className="phase-education-title"><Info size={16} /> Estás viendo la Nueva Quiniela</span>
        <span className="phase-education-text">
          Esta tabla empieza desde cero. <strong>La Quiniela RH no se borró</strong>: consulta los resultados anteriores en “Resultados RH anterior”.
        </span>
      </div>
      <div className="phase-education-actions">
        {onGoRh && (
          <button className="phase-education-rh-btn" onClick={onGoRh} type="button">
            <Trophy size={14} /> Ver Resultados RH anterior
          </button>
        )}
        <button className="phase-education-dismiss" onClick={dismiss} type="button">
          Entendido
        </button>
      </div>
    </div>
  );
}
