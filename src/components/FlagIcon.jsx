import { getTeamCountryCode } from '../services/teamFlags';

export default function FlagIcon({ team, countryCode, label, squared = false, className = '' }) {
  const code = (countryCode || getTeamCountryCode(team) || '').toLowerCase();
  const fallback = String(label || team || code || '??').slice(0, 3).toUpperCase();

  return (
    <span
      className={`flag-icon flag-${code || 'fallback'} ${squared ? 'is-square' : ''} ${className}`}
      role="img"
      aria-label={label || team || code || 'Bandera'}
      title={label || team || code || 'Bandera'}
    >
      {!code && fallback}
    </span>
  );
}
