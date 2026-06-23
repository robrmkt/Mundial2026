import { useEffect, useRef } from 'react';
import { celebrateMexicoHype } from '../services/celebrations';

// Tipos de overlay permitidos según el contexto de México.
const TYPES_BY_MODE = {
  tomorrow: ['mexico_tomorrow', 'mexico_hype', 'mexico_faith', 'mexico_countdown'],
  today: ['mexico_today', 'mexico_hype', 'mexico_faith', 'mexico_countdown'],
  live: ['mexico_live', 'mexico_hype', 'mexico_faith']
};

// Copys por (modo, tipo): el mismo tipo cambia de subtítulo según el momento.
const COPY_BY_MODE = {
  tomorrow: {
    mexico_tomorrow: { big: 'MAÑANA JUEGA MÉXICO', sub: 'La fe ya está calentando' },
    mexico_hype: { big: '¿Y SI SÍ?', sub: 'México está en modo fe' },
    mexico_faith: { big: '99% FE', sub: '1% probabilidad' },
    mexico_countdown: { big: 'SE VIENE MÉXICO', sub: 'Que empiece la ilusión' }
  },
  today: {
    mexico_today: { big: 'HOY JUEGA MÉXICO', sub: 'Se vale ilusionarse' },
    mexico_hype: { big: '¿Y SI SÍ?', sub: 'Hoy amanecimos con fe' },
    mexico_faith: { big: '99% FE', sub: '1% probabilidad' },
    mexico_countdown: { big: 'MODO MÉXICO', sub: 'Cada vez falta menos' }
  },
  live: {
    mexico_live: { big: 'VAMOS MÉXICO', sub: 'La oficina está con todo' },
    mexico_hype: { big: '¿Y SI SÍ?', sub: 'Todavía hay fe' },
    mexico_faith: { big: '99% FE', sub: 'El 1% que haga su parte' }
  }
};

// Frecuencia por modo: primer overlay, repetición y mínimo entre overlays.
const FREQ_BY_MODE = {
  tomorrow: { first: [5000, 8000], repeat: [4 * 60_000, 8 * 60_000], minGap: 90_000 },
  today: { first: [4000, 7000], repeat: [2 * 60_000, 5 * 60_000], minGap: 75_000 },
  live: { first: [3000, 6000], repeat: [90_000, 3 * 60_000], minGap: 60_000 }
};

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isMexicoMatch(match) {
  return ['México', 'Mexico'].includes(match?.homeTeam) || ['México', 'Mexico'].includes(match?.awayTeam);
}

// Contexto de México por FECHA LOCAL del navegador (no por diferencia de horas).
function getMexicoMatchContext(matches) {
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const tomorrowKey = getLocalDateKey(addDays(now, 1));

  const mexicoMatches = matches.filter(isMexicoMatch);

  const live = mexicoMatches.find(m => m.status === 'LIVE');
  if (live) return { mode: 'live', match: live };

  const next = mexicoMatches
    .filter(m => m.status === 'SCHEDULED' && m.kickoff)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
  if (!next) return { mode: 'none', match: null };

  const kickoffKey = getLocalDateKey(new Date(next.kickoff));
  if (kickoffKey === todayKey) return { mode: 'today', match: next };
  if (kickoffKey === tomorrowKey) return { mode: 'tomorrow', match: next };
  return { mode: 'future', match: next };
}

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min));
}

function getRandomType(mode) {
  const list = TYPES_BY_MODE[mode] || [];
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Pool de banners (imágenes en /public). Temático cuando aplica, aleatorio si no.
const BANNER_IDS = ['fe', 'ysisi'];
const BANNER_BY_TYPE = { mexico_faith: 'fe', mexico_hype: 'ysisi' };
const BANNER_SRCS = [
  '/mexico-hype-desktop.webp', '/mexico-hype-mobile.webp',
  '/mexico-ysisi-desktop.webp', '/mexico-ysisi-mobile.webp'
];

function pickBanner(type) {
  return BANNER_BY_TYPE[type] || BANNER_IDS[Math.floor(Math.random() * BANNER_IDS.length)];
}

function preloadBanners() {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  BANNER_SRCS.forEach(src => { const img = new Image(); img.src = src; });
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function useMexicoHype({ matches, activeTab, enqueueOverlay }) {
  // El mínimo entre overlays se conserva aunque cambie el modo (today -> live).
  const lastShownRef = useRef(0);

  useEffect(() => {
    if (activeTab === 'admin' || reducedMotion()) return undefined;

    const ctx = getMexicoMatchContext(matches);
    // Solo hay alertas automáticas si México juega hoy, mañana o está en vivo.
    if (!FREQ_BY_MODE[ctx.mode]) return undefined;

    preloadBanners(); // que el banner aparezca al instante junto al confeti
    const freq = FREQ_BY_MODE[ctx.mode];
    let cancelled = false;
    let timer;

    const schedule = (initial = false) => {
      const [lo, hi] = initial ? freq.first : freq.repeat;
      timer = setTimeout(() => {
        if (cancelled) return;
        // Si la pestaña está oculta, no encolamos: reintentamos más tarde.
        if (document.hidden) { schedule(false); return; }

        const now = Date.now();
        if (now - lastShownRef.current >= freq.minGap) {
          const type = getRandomType(ctx.mode);
          if (type) {
            const copy = COPY_BY_MODE[ctx.mode]?.[type] || {};
            enqueueOverlay({
              type,
              payload: {
                ...copy,
                mode: ctx.mode,
                banner: pickBanner(type),
                homeTeam: ctx.match?.homeTeam,
                awayTeam: ctx.match?.awayTeam
              }
            });
            celebrateMexicoHype();
            lastShownRef.current = now;
          }
        }
        schedule(false);
      }, rand(lo, hi));
    };

    schedule(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeTab, enqueueOverlay, matches]);
}
