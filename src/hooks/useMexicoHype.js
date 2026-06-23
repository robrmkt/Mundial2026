import { useEffect, useRef } from 'react';
import { celebrateMexicoGoal } from '../services/celebrations';

const TYPES = ['mexico_hype', 'mexico_faith', 'mexico_today', 'mexico_countdown'];
const MIN_GAP = 90_000;

function isMexicoMatch(match) {
  return ['México', 'Mexico'].includes(match?.homeTeam) || ['México', 'Mexico'].includes(match?.awayTeam);
}

function getMexicoMatchContext(matches) {
  const now = Date.now();
  const mexicoMatches = matches.filter(isMexicoMatch);
  const live = mexicoMatches.find(m => m.status === 'LIVE');
  if (live) return { mode: 'live', match: live };
  const next = mexicoMatches
    .filter(m => m.status === 'SCHEDULED' && m.kickoff)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
  if (!next) return { mode: 'none', match: null };
  const diffMs = new Date(next.kickoff).getTime() - now;
  const hours = diffMs / 3600000;
  if (hours <= 24 && hours > 0) return { mode: 'soon', match: next };
  return { mode: 'future', match: next };
}

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min));
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function useMexicoHype({ matches, activeTab, enqueueOverlay }) {
  const lastShownRef = useRef(0);

  useEffect(() => {
    if (activeTab === 'admin' || reducedMotion()) return undefined;
    const ctx = getMexicoMatchContext(matches);
    if (ctx.mode === 'none' || ctx.mode === 'future') return undefined;

    let cancelled = false;
    let timer;

    const schedule = (initial = false) => {
      const delay = initial
        ? rand(5000, 8000)
        : ctx.mode === 'live'
          ? rand(2 * 60_000, 5 * 60_000)
          : rand(3 * 60_000, 7 * 60_000);
      timer = setTimeout(() => {
        if (cancelled || document.hidden) { schedule(false); return; }
        const now = Date.now();
        if (now - lastShownRef.current >= MIN_GAP) {
          const type = TYPES[Math.floor(Math.random() * TYPES.length)];
          enqueueOverlay({
            type,
            payload: { homeTeam: ctx.match?.homeTeam, awayTeam: ctx.match?.awayTeam },
            _id: `mx_${now}_${Math.random().toString(36).slice(2, 7)}`,
            _t: now
          });
          celebrateMexicoGoal();
          lastShownRef.current = now;
        }
        schedule(false);
      }, delay);
    };

    schedule(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeTab, enqueueOverlay, matches]);
}
