// Estante de insignias para la ficha: muestra hasta 5 destacadas (mayor rareza
// primero) + "ver todas", con tooltip y color por rareza.
import { useState } from 'react';
import { topBadges } from '../services/achievements';

const RARITY_LABEL = {
  legendary: 'Legendaria',
  epic: 'Épica',
  rare: 'Rara',
  common: 'Común',
  meme: 'Meme'
};

export default function BadgeShelf({ badges = [] }) {
  const [showAll, setShowAll] = useState(false);
  if (!badges.length) return null;
  const shown = showAll ? badges : topBadges(badges, 5);

  return (
    <div className="badge-shelf">
      <div className="badge-shelf-head">
        <span className="badge-shelf-title">Insignias <em>{badges.length}</em></span>
        {badges.length > 5 && (
          <button type="button" className="badge-shelf-toggle" onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Ver menos' : 'Ver todas'}
          </button>
        )}
      </div>
      <div className="badge-grid">
        {shown.map(b => (
          <span
            key={b.id}
            className={`badge-chip rarity-${b.rarity}`}
            title={`${b.title} · ${RARITY_LABEL[b.rarity] || ''} — ${b.desc}`}
          >
            {b.title}
          </span>
        ))}
      </div>
    </div>
  );
}
