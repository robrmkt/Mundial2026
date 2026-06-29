import { Trophy, Sparkles } from 'lucide-react';

// Aviso especial cuando la tabla de la Nueva Quiniela está toda en ceros.
// Evita que el "0" se lea como pérdida de datos.
export default function PhaseZeroStateNotice({ onGoRh }) {
  return (
    <div className="phase-zero-state">
      <div className="phase-zero-state-icon"><Sparkles size={22} /></div>
      <div className="phase-zero-state-copy">
        <h4>Nueva Quiniela recién iniciada</h4>
        <p>
          Todos empiezan desde cero en esta nueva fase. Los puntos de la Quiniela RH anterior
          <strong> no se borraron</strong>: siguen guardados en Resultados RH anterior.
        </p>
      </div>
      {onGoRh && (
        <button className="phase-zero-state-btn" onClick={onGoRh} type="button">
          <Trophy size={14} /> Ver resultados RH
        </button>
      )}
    </div>
  );
}
