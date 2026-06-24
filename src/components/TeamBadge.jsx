// Escudo del equipo interno (la empresa es un grupo de 2: Team BZ rojo / Team UP azul).
// Se asigna por participante desde el Admin (campo `team`) y aparece junto a su foto.
export const TEAMS = {
  bz: { src: '/team-bz.webp', label: 'Team BZ' },
  up: { src: '/team-up.webp', label: 'Team UP' }
};

export default function TeamBadge({ team, className = '' }) {
  const t = TEAMS[team];
  if (!t) return null;
  return (
    <img
      src={t.src}
      alt={t.label}
      title={t.label}
      className={`team-badge ${className}`}
      loading="lazy"
      draggable="false"
    />
  );
}
