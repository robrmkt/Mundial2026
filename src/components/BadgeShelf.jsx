// Estante de insignias tipo medallas coleccionables (estilo cromo/Pokémon).
// Muestra hasta 6 destacadas (mayor rareza primero) + "ver todas". Al tocar una
// medalla se abre su detalle con la explicación creativa.
import { useState } from 'react';
import { topBadges } from '../services/achievements';
import BadgeDetail from './BadgeDetail';

export default function BadgeShelf({ badges = [] }) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);
  if (!badges.length) return null;
  const shown = showAll ? badges : topBadges(badges, 6);

  return (
    <div className="badge-shelf">
      <div className="badge-shelf-head">
        <span className="badge-shelf-title">Insignias <em>{badges.length}</em></span>
        {badges.length > 6 && (
          <button type="button" className="badge-shelf-toggle no-export" onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Ver menos' : 'Ver todas'}
          </button>
        )}
      </div>
      <div className="medal-grid">
        {shown.map(b => (
          <button
            key={b.id}
            type="button"
            className={`medal rarity-${b.rarity}`}
            title={b.label}
            aria-label={`${b.label} — ver por qué`}
            onClick={() => setSelected(b)}
          >
            <span className="medal-icon" aria-hidden="true">{b.icon}</span>
          </button>
        ))}
      </div>
      {selected && <BadgeDetail badge={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
