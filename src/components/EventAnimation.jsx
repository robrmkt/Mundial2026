// Animación a pantalla de UN evento mayor (gol, nuevo líder, exacto, tarjeta…).
// El texto/clase salen del TIPO semántico; el confeti lo dispara quien encola
// (App), para no duplicarlo aquí.
import EventIcon from './EventIcon';

const COPY = {
  goal: (p) => ({ big: '¡GOOOL!', sub: [p.team, p.score, p.minute].filter(Boolean).join(' · ') }),
  mexico_goal: (p) => ({ big: '¡GOOOL DE MÉXICO!', sub: [p.score, p.minute].filter(Boolean).join(' · ') }),
  leader_change: (p) => ({
    big: 'NUEVO LÍDER',
    sub: p.name ? `${p.name}${p.points != null ? ` toma la cima con ${p.points} pts` : ''}` : ''
  }),
  exact_score: (p) => ({ big: '¡MARCADOR EXACTO!', sub: p.winners ? `${p.winners} clavó el marcador (+3)` : '' }),
  red_card: () => ({ big: 'TARJETA ROJA', sub: '' }),
  yellow_card: () => ({ big: 'AMARILLA', sub: '' }),
  penalty: () => ({ big: 'PENAL', sub: '' }),
  penalty_missed: () => ({ big: '¡LO FALLÓ!', sub: '' }),
  var: () => ({ big: 'REVISA EL VAR', sub: '' }),
  fulltime: (p) => ({ big: 'FINAL', sub: p.text || '' }),
  mexico_hype: () => ({ big: '¿Y SI SÍ?', sub: 'México está en modo fe' }),
  mexico_faith: () => ({ big: '99% FE', sub: '1% probabilidad' }),
  mexico_today: () => ({ big: 'HOY JUEGA MÉXICO', sub: 'Se vale ilusionarse' }),
  mexico_countdown: () => ({ big: 'MODO MÉXICO', sub: 'Cada vez falta menos' }),
  boo: () => ({ big: 'BUUU', sub: 'La oficina mete presión' })
};

export default function EventAnimation({ event }) {
  const build = COPY[event.type] || (() => ({ big: '', sub: '' }));
  const { big, sub } = build(event.payload || {});
  return (
    <div className={`event-anim event-anim-${event.type}`} role="status">
      <div className="event-anim-card">
        <EventIcon type={event.type} size={72} className="event-anim-icon" />
        {big && <div className="event-anim-big">{big}</div>}
        {sub && <div className="event-anim-sub">{sub}</div>}
      </div>
    </div>
  );
}
