// Ícono de un evento por TIPO SEMÁNTICO. Usa emoji de respaldo; si algún día
// hay stickers locales (manifest.ASSETS_AVAILABLE), se podría intercambiar aquí
// sin tocar el resto del código.
import { TYPE_EMOJI } from '../assets/manifest';

export default function EventIcon({ type, size = 28, className = '' }) {
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
