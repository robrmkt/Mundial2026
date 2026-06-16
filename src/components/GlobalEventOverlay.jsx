// Overlay global de eventos: recibe una cola de eventos mayores y los muestra
// uno a la vez, por prioridad, con un mínimo de 5 s entre overlays grandes y
// descartando los que ya quedaron viejos. Respeta prefers-reduced-motion.
import { useEffect, useRef, useState } from 'react';
import EventAnimation from './EventAnimation';

const PRIORITY = {
  mexico_goal: 1, goal: 2, red_card: 3, penalty: 4, penalty_missed: 4,
  leader_change: 5, exact_score: 6, fulltime: 6, podium_change: 7, var: 7,
  yellow_card: 8, luck: 9, boo: 10, reaction: 11
};
const DURATION = { mexico_goal: 4200, goal: 3500, leader_change: 4200, exact_score: 3600, red_card: 3000 };
const DEFAULT_DURATION = 2800;
const MIN_GAP = 5000;    // como máximo un overlay grande cada 5 s
const STALE_MS = 30000;  // un evento que esperó >30 s ya no se anima

function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export default function GlobalEventOverlay({ queue = [], onConsume }) {
  const [current, setCurrent] = useState(null);
  const lastShownRef = useRef(0);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (current || queue.length === 0) return undefined;

    const now = Date.now();
    const stale = queue.filter(e => now - (e._t || 0) > STALE_MS);
    if (stale.length) { stale.forEach(e => onConsume(e._id)); return undefined; }

    // Mayor prioridad primero (número menor = más importante).
    const next = [...queue].sort((a, b) => (PRIORITY[a.type] || 99) - (PRIORITY[b.type] || 99))[0];
    const wait = Math.max(0, MIN_GAP - (now - lastShownRef.current));

    const startTimer = setTimeout(() => {
      setCurrent(next);
      lastShownRef.current = Date.now();
      const dur = prefersReduced() ? 1600 : (DURATION[next.type] || DEFAULT_DURATION);
      hideTimerRef.current = setTimeout(() => {
        setCurrent(null);
        onConsume(next._id);
      }, dur);
    }, wait);

    return () => clearTimeout(startTimer);
  }, [queue, current, onConsume]);

  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  if (!current) return null;
  return (
    <div className="global-event-overlay" aria-live="polite">
      <EventAnimation event={current} />
    </div>
  );
}
