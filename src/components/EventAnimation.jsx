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
  mexico_tomorrow: () => ({ big: 'MAÑANA JUEGA MÉXICO', sub: 'La fe ya está calentando' }),
  mexico_today: () => ({ big: 'HOY JUEGA MÉXICO', sub: 'Se vale ilusionarse' }),
  mexico_live: () => ({ big: 'VAMOS MÉXICO', sub: 'La oficina está con todo' }),
  mexico_countdown: () => ({ big: 'MODO MÉXICO', sub: 'Cada vez falta menos' }),
  boo: () => ({ big: 'BUUU', sub: 'La oficina mete presión' })
};

// Alertas de hype de México: se muestran como BANNER (imagen) + confeti, no como
// tarjeta de texto. (mexico_goal NO entra aquí: ese sí es el festejo de gol.)
const MX_HYPE_TYPES = ['mexico_hype', 'mexico_faith', 'mexico_tomorrow', 'mexico_today', 'mexico_live', 'mexico_countdown'];
const MX_HEADLINE = {
  tomorrow: 'MAÑANA JUEGA MÉXICO',
  today: 'HOY JUEGA MÉXICO',
  live: 'MÉXICO EN VIVO'
};
// Catálogo de banners. El hook elige cuál (payload.banner); aquí solo se renderiza.
const MX_BANNERS = {
  fe: { desktop: '/mexico-hype-desktop.webp', mobile: '/mexico-hype-mobile.webp', alt: '99% de fe · 1% de probabilidad · ¡Vamos México!' },
  ysisi: { desktop: '/mexico-ysisi-desktop.webp', mobile: '/mexico-ysisi-mobile.webp', alt: '¿Y si sí? · ¡Vamos México!' }
};

export default function EventAnimation({ event }) {
  const payload = event.payload || {};

  if (MX_HYPE_TYPES.includes(event.type)) {
    const headline = MX_HEADLINE[payload.mode] || '';
    const banner = MX_BANNERS[payload.banner] || MX_BANNERS.ysisi;
    return (
      <div className="event-anim event-anim-mx-banner" role="status">
        {headline && <div className="mx-banner-headline">{headline}</div>}
        <picture className="mx-banner-pic">
          <source media="(max-width: 760px)" srcSet={banner.mobile} />
          <img className="mx-banner-img" src={banner.desktop} alt={banner.alt} />
        </picture>
      </div>
    );
  }

  const build = COPY[event.type] || (() => ({ big: '', sub: '' }));
  const base = build(payload);
  // El copy contextual del hook (payload.big/sub) tiene prioridad sobre el default.
  const big = payload.big || base.big;
  const sub = payload.sub != null ? payload.sub : base.sub;
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
