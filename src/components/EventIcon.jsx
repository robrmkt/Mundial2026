// Ícono de un evento por TIPO SEMÁNTICO. Usa emoji de respaldo; si algún día
// hay stickers locales (manifest.ASSETS_AVAILABLE), se podría intercambiar aquí
// sin tocar el resto del código.
import { TYPE_EMOJI } from '../assets/manifest';
import FlagIcon from './FlagIcon';

export default function EventIcon({ type, size = 28, className = '' }) {
  if (['mexico_goal', 'mexico_hype', 'mexico_faith', 'mexico_today', 'mexico_countdown'].includes(type)) {
    return (
      <span className={`event-icon event-icon-flag ${className}`} style={{ width: size, height: Math.round(size * 0.68) }}>
        <FlagIcon countryCode="mx" label="México" squared />
      </span>
    );
  }
  const emoji = TYPE_EMOJI[type] || TYPE_EMOJI.generic;
  return (
    <span
      className={`event-icon ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
      role="img"
      aria-label={type}
    >
      {emoji}
    </span>
  );
}
