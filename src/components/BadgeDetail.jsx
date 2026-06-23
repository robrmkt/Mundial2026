// Detalle de una insignia: medallón grande + nombre + rareza + explicación
// creativa (el "por qué"). Modal propio, encima de la ficha. No se exporta al PNG.
import { useEffect } from 'react';
import { X } from 'lucide-react';

const RARITY_LABEL = {
  legendary: 'Legendaria',
  epic: 'Épica',
  rare: 'Rara',
  common: 'Común',
  meme: 'Meme'
};

export default function BadgeDetail({ badge, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="badge-detail-overlay no-export" onClick={onClose}>
      <div
        className="badge-detail"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={badge.label}
      >
        <button className="badge-detail-close" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        <div className={`medal big rarity-${badge.rarity} badge-${badge.id} ${badge.asset ? 'has-asset' : ''}`}>
          {badge.asset ? (
            <img className="medal-asset" src={badge.asset} alt="" aria-hidden="true" />
          ) : (
            <span className="medal-icon" aria-hidden="true">{badge.icon}</span>
          )}
        </div>
        <div className="badge-detail-name">{badge.label}</div>
        <span className={`badge-detail-rarity rarity-${badge.rarity}`}>{RARITY_LABEL[badge.rarity] || ''}</span>
        <p className="badge-detail-flavor">{badge.flavor}</p>
      </div>
    </div>
  );
}
