import { getTeamCountryCode } from '../services/teamFlags';

export default function FlagIcon({ team, countryCode, label, squared = false, className = '' }) {
  const code = (countryCode || getTeamCountryCode(team) || '').toLowerCase();
  const name = label || team || '';

  // Sin código de país: fallback discreto, texto plano alineado (no círculo grande).
  if (!code) {
    const fallback = String(name || '??').slice(0, 3).toUpperCase();
    return (
      <span
        className={`flag-fallback ${className}`}
        role="img"
        aria-label={name || 'Bandera'}
        title={name || ''}
      >
        {fallback}
      </span>
    );
  }

  return (
    <span
      className={`flag-icon flag-${code} ${squared ? 'is-square' : ''} ${className}`}
      role="img"
      aria-label={name || code}
      title={name || code}
    />
  );
}
