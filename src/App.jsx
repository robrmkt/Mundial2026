import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDashboardMode, DEFAULT_NEW_QUINIELA_START_AT } from './services/standingsMode';
import { buildContinuationStandings } from './services/continuationStandings';
import { buildSafeCombinedStandings } from './services/combinedStandings';
import { isNewQuinielaMode, getActivePredictionWindow, getPhaseMatches, getPredictionParticipants } from './services/phaseContext';
import { assignDenseRanksByPoints, getDensePodiumNames } from './services/ranking';
import { Trophy, Square, Users, MonitorPlay, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import AdminLogin from './components/AdminLogin';
import Dashboard from './components/Dashboard';

// El panel de admin (y la pesada librería xlsx) se cargan solo al entrar a #admin,
// así el bundle inicial que descargan todos los participantes es mucho más ligero.
const AdminPanel = lazy(() => import('./components/AdminPanel'));
import PredictionGrid from './components/PredictionGrid';
import NewQuinielaPage from './components/NewQuinielaPage';
import CapitalHumanoArchive from './components/CapitalHumanoArchive';
import RhTransitionPopup from './components/RhTransitionPopup';
import LiveMatches from './components/LiveMatches';
import GlobalEventOverlay from './components/GlobalEventOverlay';
import MatchTicker from './components/MatchTicker';
import { fetchScoreboard, mergeScoreboard } from './services/liveData';
import { celebrateGoal, celebrateMexicoGoal, celebratePodium, celebrateFinal, celebrateExact, celebrateReaction, celebratePodiumReaction } from './services/celebrations';
import { unlockSounds } from './services/sounds';
import { getSession, logout } from './services/auth';
import {
  fetchEventsSince,
  postEvent,
  postPodiumReaction,
  hasSeenEvent,
  markEventSeen,
  isOwnEvent
} from './services/sharedEvents';
import { computePodiumAndMovement } from './services/podiumReplay';
import { pingVisitStats } from './services/visitStats';
import useMexicoHype from './hooks/useMexicoHype';

import initialMatches from './matches.json';

// Emoji por tipo de porra (fallback visual; la lógica usa la clave, no el emoji).
const REACTION_EMOJI = { confetti: '🎉', balls: '⚽', fire: '🔥', mexico: '🇲🇽', canada: '🇨🇦', usa: '🇺🇸', luck: '🍀', buzz: '🥁', clap: '👏', faith: '🙏', boo: '👻' };
const PODIUM_REACTION_COPY = {
  bank: '🔥 bancó el podio de',
  suspect: '👀 sospecha de',
  salt: '🧂 le ardió ver a'
};

const DATA_VERSION = 'real-data-2026-06-15-v1';
const DATA_VERSION_KEY = 'quiniela_data_version';
const VERSIONED_STORAGE_KEYS = [
  'quiniela_matches',
  'quiniela_chat'
];

function ensureCurrentDataVersion() {
  try {
    const currentVersion = window.localStorage.getItem(DATA_VERSION_KEY);
    if (currentVersion === DATA_VERSION) return;

    VERSIONED_STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));
    window.localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
  } catch (error) {
    console.error(error);
  }
}

// Custom hook to persistent state
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(value => {
    try {
      setStoredValue(prevValue => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  return [storedValue, setValue];
}

function calculateDetailedStats(predictions, matchesList) {
  let score = 0;
  let exactHits = 0;
  let outcomeHits = 0;
  let playedAndPredicted = 0;

  matchesList.forEach(m => {
    if (m.status === 'SCHEDULED') return;

    const pred = predictions[m.id];
    if (!pred) return;

    const pHome = parseInt(pred.homeScore, 10);
    const pAway = parseInt(pred.awayScore, 10);
    const mHome = parseInt(m.homeScore, 10);
    const mAway = parseInt(m.awayScore, 10);
    // Ignora pronósticos sin número válido (vacío, null, texto) para no perder puntos en silencio
    if ([pHome, pAway, mHome, mAway].some(Number.isNaN)) return;

    playedAndPredicted++;

    const exactMatch = (pHome === mHome && pAway === mAway);
    const predOutcome = Math.sign(pHome - pAway);
    const actualOutcome = Math.sign(mHome - mAway);
    const outcomeMatch = (predOutcome === actualOutcome);

    if (exactMatch) {
      score += 3;
      exactHits++;
    } else if (outcomeMatch) {
      score += 1;
      outcomeHits++;
    }
  });

  const effectiveness = playedAndPredicted > 0
    ? Math.round(((exactHits + outcomeHits) / playedAndPredicted) * 100)
    : 0;

  return {
    points: score,
    exactHits,
    outcomeHits,
    effectiveness,
    playedAndPredicted
  };
}

const TAB_HASHES = {
  '#tabla': 'dashboard',
  '#pronosticos': 'predictions',
  '#partidos': 'matches',
  '#admin': 'admin',
  '#fase2': 'nuevaQuiniela',
  '#nueva-quiniela': 'nuevaQuiniela',
  '#capital-humano': 'capitalHumano'
};

const HASH_BY_TAB = {
  dashboard: '#tabla',
  predictions: '#pronosticos',
  matches: '#partidos',
  admin: '#admin',
  nuevaQuiniela: '#nueva-quiniela',
  capitalHumano: '#capital-humano'
};

function tabFromHash() {
  return TAB_HASHES[window.location.hash] || 'dashboard';
}

function nowTimeStr() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

async function fetchSharedState() {
  const response = await fetch('/api/state', { cache: 'no-store' });
  if (!response.ok) throw new Error('No pude leer los datos compartidos.');
  return response.json();
}

async function saveSharedState(state) {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  });
  if (!response.ok) throw new Error('No pude guardar los datos compartidos.');
  return response.json();
}

export default function App() {
  ensureCurrentDataVersion();

  const [matches, setMatches] = useLocalStorage('quiniela_matches', initialMatches);
  const [participants, setParticipantsState] = useState([]);
  const [documents, setDocumentsState] = useState([]);
  const [support, setSupportState] = useState({});
  const [podiumReactions, setPodiumReactions] = useState({});
  const [continuationSettings, setContinuationSettings] = useState(null);
  const [capitalHumanoArchive, setCapitalHumanoArchive] = useState(null);
  const [phaseSubmissions, setPhaseSubmissions] = useState([]);
  const [predictionWindows, setPredictionWindows] = useState([]);
  const [chatMessages, setChatMessages] = useLocalStorage('quiniela_chat', [
    { id: 1, user: 'Sistema', time: '12:00', text: '¡Bienvenidos a la Quiniela del Mundial 26! Que gane el mejor. 🏆' }
  ]);

  const [activeTab, setActiveTab] = useState(tabFromHash);
  const [simActive, setSimActive] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [overlayQueue, setOverlayQueue] = useState([]);
  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
  const [session, setSession] = useState(getSession);
  const [visitStats, setVisitStats] = useState(null);
  const [, setSharedState] = useState({ status: 'loading', lastSync: null });
  // Reloj lento (cada 60 s) para refrescar el "tiempo en podio" sin re-render por segundo.
  const [nowTs, setNowTs] = useState(() => Date.now());

  const simIntervalRef = useRef(null);
  const simActiveRef = useRef(simActive);
  const syncBusyRef = useRef(false);
  const prevLeaderRef = useRef(null);
  const matchesRef = useRef(matches);
  const sharedDataRef = useRef({ participants: [], documents: [] });
  const persistBusyRef = useRef(0);
  const eventCursorRef = useRef(null);

  useEffect(() => {
    simActiveRef.current = simActive;
  }, [simActive]);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  // Trigger Goal Alert Toast
  const triggerToast = useCallback((title, desc) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, desc }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Cola del overlay global de animaciones (gol, líder, exacto…).
  const enqueueOverlay = useCallback((ev) => {
    setOverlayQueue(q => [
      ...q.slice(-7),
      { ...ev, _id: `ov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, _t: Date.now() }
    ]);
  }, []);
  const consumeOverlay = useCallback((id) => {
    setOverlayQueue(q => q.filter(e => e._id !== id));
  }, []);

  useMexicoHype({ matches, activeTab, enqueueOverlay });

  const participantsRef = useRef(participants);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    sharedDataRef.current = { participants, documents };
  }, [participants, documents]);

  const loadSharedData = useCallback(async ({ silent = true } = {}) => {
    // Si hay un guardado (PUT) en vuelo, no dejamos que el sondeo traiga datos
    // viejos y revierta lo recién subido (p.ej. una foto).
    if (persistBusyRef.current > 0) return;
    try {
      if (!silent) setSharedState(prev => ({ ...prev, status: 'loading' }));
      const data = await fetchSharedState();
      const nextParticipants = Array.isArray(data.participants) ? data.participants : [];
      const nextDocuments = Array.isArray(data.documents) ? data.documents : [];
      const nextSupport = data.support && typeof data.support === 'object' && !Array.isArray(data.support) ? data.support : {};
      const nextPodiumReactions = data.podiumReactions && typeof data.podiumReactions === 'object' && !Array.isArray(data.podiumReactions) ? data.podiumReactions : {};
      const nextSettings = data.continuationSettings && typeof data.continuationSettings === 'object' ? data.continuationSettings : null;
      setParticipantsState(nextParticipants);
      setDocumentsState(nextDocuments);
      setSupportState(nextSupport);
      setPodiumReactions(nextPodiumReactions);
      setContinuationSettings(nextSettings);
      setCapitalHumanoArchive(data.capitalHumanoArchive || null);
      setPhaseSubmissions(Array.isArray(data.phaseSubmissions) ? data.phaseSubmissions : []);
      setPredictionWindows(Array.isArray(data.predictionWindows) ? data.predictionWindows : []);
      sharedDataRef.current = { participants: nextParticipants, documents: nextDocuments };
      setSharedState({ status: 'ok', lastSync: new Date() });
    } catch (error) {
      console.error(error);
      setSharedState(prev => ({ ...prev, status: 'error' }));
      if (!silent) triggerToast('Datos compartidos', 'No pude leer los datos guardados en Railway.');
    }
  }, [triggerToast]);

  const persistSharedData = useCallback(async (nextData) => {
    persistBusyRef.current += 1;
    try {
      const saved = await saveSharedState(nextData);
      setSharedState({ status: 'ok', lastSync: new Date() });
      return saved;
    } catch (error) {
      console.error(error);
      setSharedState(prev => ({ ...prev, status: 'error' }));
      triggerToast('No se guardó en Railway', 'Revisa conexión y vuelve a intentar. Los demás podrían no ver este cambio.');
      return null;
    } finally {
      persistBusyRef.current -= 1;
    }
  }, [triggerToast]);

  const setSharedParticipants = useCallback((updater) => {
    setParticipantsState(prev => {
      const nextParticipants = updater instanceof Function ? updater(prev) : updater;
      const nextData = { ...sharedDataRef.current, participants: nextParticipants };
      sharedDataRef.current = nextData;
      persistSharedData({ participants: nextParticipants });
      return nextParticipants;
    });
  }, [persistSharedData]);

  const setSharedDocuments = useCallback((updater) => {
    setDocumentsState(prev => {
      const nextDocuments = updater instanceof Function ? updater(prev) : updater;
      const nextData = { ...sharedDataRef.current, documents: nextDocuments };
      sharedDataRef.current = nextData;
      persistSharedData({ documents: nextDocuments });
      return nextDocuments;
    });
  }, [persistSharedData]);

  useEffect(() => {
    const initialLoad = setTimeout(() => loadSharedData(), 0);
    const interval = setInterval(() => loadSharedData(), 15000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadSharedData]);

  // Routing por hash: el admin no aparece en el menú, se entra con #admin
  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goToTab = useCallback((tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', HASH_BY_TAB[tab] || '#tabla');
  }, []);

  const openPredictionsForMatch = useCallback((matchId) => {
    try {
      window.sessionStorage.setItem('preferred_prediction_match_id', String(matchId));
    } catch {
      /* sessionStorage no disponible: solo abrimos la pestaña */
    }
    goToTab('predictions');
  }, [goToTab]);

  const pushChatMessage = useCallback((user, text, highlight = false) => {
    setChatMessages(prev => [
      ...prev.slice(-120),
      { id: Date.now() + Math.random(), user, time: nowTimeStr(), text, highlight }
    ]);
  }, [setChatMessages]);

  // ---- Sincronización con resultados reales (ESPN, sin API key) ----
  const syncNow = useCallback(async ({ silent = true } = {}) => {
    if (syncBusyRef.current || simActiveRef.current) return;
    syncBusyRef.current = true;
    setSyncState(prev => ({ ...prev, status: 'syncing' }));

    try {
      const events = await fetchScoreboard();
      const { merged, goals: detectedGoals, finished: detectedFinished, changed } = mergeScoreboard(matchesRef.current, events);

      if (changed) {
        matchesRef.current = merged;
        setMatches(merged);
      }

      detectedGoals.forEach(goal => {
        triggerToast('⚽ ¡GOOOL!', `${goal.flag} ${goal.team} anota vs ${goal.rival} · ${goal.score} (${goal.minute})`);
        pushChatMessage('Sistema', `⚽ ¡Gol de ${goal.team}! Va ${goal.score} contra ${goal.rival} (${goal.minute}).`, true);
      });
      if (detectedGoals.length > 0) {
        const mxGoal = detectedGoals.find(goal => goal.team === 'México');
        if (mxGoal) celebrateMexicoGoal();
        else celebrateGoal();
        const lead = mxGoal || detectedGoals[0];
        enqueueOverlay({
          type: mxGoal ? 'mexico_goal' : 'goal',
          payload: { team: lead.team, score: lead.score, minute: lead.minute }
        });
      }

      // Partidos que terminaron mientras la página estaba abierta
      detectedFinished.forEach(fin => {
        triggerToast('🏁 Final', `${fin.homeFlag} ${fin.homeTeam} ${fin.homeScore} - ${fin.awayScore} ${fin.awayTeam} ${fin.awayFlag}`);
        pushChatMessage('Sistema', `🏁 Final: ${fin.homeTeam} ${fin.homeScore} - ${fin.awayScore} ${fin.awayTeam}.`);

        const exactWinners = participantsRef.current
          .filter(p => {
            const pred = p.predictions[fin.matchId];
            return pred && Number(pred.homeScore) === fin.homeScore && Number(pred.awayScore) === fin.awayScore;
          })
          .map(p => p.name);

        if (exactWinners.length > 0) {
          celebrateExact();
          triggerToast('🎯 ¡Marcador exacto!', `${exactWinners.join(', ')} clavó el ${fin.homeScore}-${fin.awayScore} (+3 pts)`);
          pushChatMessage('Sistema', `🎯 ¡${exactWinners.join(' y ')} clavó el ${fin.homeScore}-${fin.awayScore}! +3 puntos.`, true);
          enqueueOverlay({ type: 'exact_score', payload: { winners: exactWinners.join(', '), score: `${fin.homeScore}-${fin.awayScore}` } });
        } else {
          celebrateFinal();
        }
      });

      setSyncState({ status: 'ok', lastSync: new Date() });
      if (!silent) triggerToast('Datos actualizados', 'Resultados reales del Mundial sincronizados.');
    } catch (error) {
      console.error('Sync error:', error);
      setSyncState(prev => ({ ...prev, status: 'error' }));
      if (!silent) triggerToast('Sin conexión al feed', 'No pude leer los resultados en vivo. Reintento automático en breve.');
    } finally {
      syncBusyRef.current = false;
    }
  }, [pushChatMessage, setMatches, triggerToast, enqueueOverlay]);

  // Sincroniza al abrir y luego en automático (30s con partidos en vivo, 90s si no)
  const anyLive = matches.some(m => m.status === 'LIVE');
  useEffect(() => {
    const initialSync = setTimeout(() => syncNow(), 0);
    return () => clearTimeout(initialSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (simActive) return undefined;
    const interval = setInterval(() => syncNow(), anyLive ? 30000 : 90000);
    return () => clearInterval(interval);
  }, [anyLive, simActive, syncNow]);

  // ---- Bus de eventos compartido (Fase 1): lo que pasa en un navegador se ve en todos ----
  const handleIncomingEvent = useCallback((event) => {
    if (!event || hasSeenEvent(event.id)) return;
    markEventSeen(event.id);
    if (isOwnEvent(event)) return; // no me re-animo lo que yo mismo lancé
    const p = event.payload || {};
    switch (event.type) {
      case 'reaction':
        celebrateReaction(p.reaction);
        pushChatMessage(p.user || 'Oficina', `lanzó una porra ${REACTION_EMOJI[p.reaction] || '🎉'}`, true);
        break;
      case 'luck':
        if (p.target) {
          celebrateReaction('clap');
          pushChatMessage('Oficina', `🍀 La oficina le mandó suerte a ${p.target}.`, true);
        }
        break;
      case 'boo':
        if (p.team) pushChatMessage('Oficina', `👻 La oficina abuchea a ${p.team}.`, true);
        break;
      case 'podium_reaction':
        if (p.target && p.reaction) {
          const copy = PODIUM_REACTION_COPY[p.reaction] || 'reaccionó al podio de';
          celebratePodiumReaction(p.reaction);
          pushChatMessage('Oficina', `${copy} ${p.target}.`, true);
          setPodiumReactions(prev => {
            const bucket = prev[p.target] || {};
            return {
              ...prev,
              [p.target]: {
                ...bucket,
                [p.reaction]: Number(bucket[p.reaction] || 0) + 1,
                lastReactedAt: new Date().toISOString()
              }
            };
          });
        }
        break;
      default:
        break;
    }
  }, [pushChatMessage]);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const poll = async () => {
      try {
        const since = eventCursorRef.current;
        const { events, serverTime } = await fetchEventsSince(since || undefined);
        if (cancelled) return;
        if (!since) {
          // Primera carga: no re-animamos el historial, solo fijamos el cursor.
          (events || []).forEach(e => markEventSeen(e.id));
        } else {
          (events || []).forEach(handleIncomingEvent);
        }
        eventCursorRef.current = serverTime || eventCursorRef.current;
      } catch {
        /* silencioso: reintenta en el próximo tick */
      } finally {
        if (!cancelled) timer = setTimeout(poll, anyLive ? 2000 : 4500);
      }
    };
    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [anyLive, handleIncomingEvent]);

  // Compute standings with rankings
  const rhStandings = useMemo(() => {
    const scoredList = participants.map(p => {
      const stats = calculateDetailedStats(p.predictions, matches);
      return { ...p, ...stats };
    });

    // Ranking DENSO por puntos: los empatados en puntos comparten lugar.
    return assignDenseRanksByPoints(scoredList);
  }, [matches, participants]);

  const newQuinielaStandings = useMemo(() =>
    buildContinuationStandings({ participants, phaseSubmissions, matches }),
    [participants, phaseSubmissions, matches]
  );

  const dashboardMode = useMemo(() =>
    getDashboardMode(continuationSettings, capitalHumanoArchive),
    [continuationSettings, capitalHumanoArchive]
  );

  const safeCombinedStandings = useMemo(() =>
    buildSafeCombinedStandings({ rhStandings, newQuinielaStandings, participants }),
    [rhStandings, newQuinielaStandings, participants]
  );

  const standings = useMemo(() => {
    if (dashboardMode === 'rh_archive') return capitalHumanoArchive?.standings || rhStandings;
    if (dashboardMode === 'rh_current') return rhStandings;
    if (dashboardMode === 'new_quiniela') return newQuinielaStandings; // independiente, desde cero
    if (dashboardMode === 'combined') return safeCombinedStandings;     // acumulado (opción manual)
    return newQuinielaStandings;
  }, [dashboardMode, safeCombinedStandings, newQuinielaStandings, capitalHumanoArchive, rhStandings]);

  const dashboardTitle = dashboardMode === 'rh_current' || dashboardMode === 'rh_archive'
    ? 'Tabla General · Quiniela RH'
    : dashboardMode === 'combined'
      ? 'Tabla General · Acumulado Mundialista'
      : 'Tabla General · Nueva Quiniela';

  // Fuente única de contexto de fase (phaseContext.js)
  const isNewMode = useMemo(() => isNewQuinielaMode(dashboardMode), [dashboardMode]);

  const activePredictionWindow = useMemo(
    () => getActivePredictionWindow(predictionWindows),
    [predictionWindows]
  );

  const phaseMatches = useMemo(
    () => getPhaseMatches({ matches, settings: continuationSettings || {}, predictionWindows, dashboardMode }),
    [matches, continuationSettings, predictionWindows, dashboardMode]
  );

  const predictionParticipants = useMemo(
    () => getPredictionParticipants({ dashboardMode, participants, newQuinielaStandings }),
    [dashboardMode, participants, newQuinielaStandings]
  );

  // Transición automática a las 23:00 del 27 jun: antes muestra RH, después Nueva.
  const newQuinielaStarted = useMemo(() => {
    const startAt = Date.parse(continuationSettings?.startAt || DEFAULT_NEW_QUINIELA_START_AT);
    return Number.isFinite(startAt) && nowTs >= startAt;
  }, [continuationSettings?.startAt, nowTs]);
  const showRhArchiveTab = Boolean(capitalHumanoArchive) || newQuinielaStarted;

  const pendingAdminCount = useMemo(() =>
    phaseSubmissions.filter(s => !s.status || s.status === 'pending').length,
    [phaseSubmissions]
  );

  // ---- Movimiento de ranking + tiempo en podio (Modo Leyenda) ----
  // Cálculo RETROACTIVO desde el inicio del Mundial: tiempo real acumulado en el
  // top-3 según los resultados. El tramo abierto (último partido → ahora) se acredita
  // al podio que se VE en pantalla (top-3 en vivo), para que el líder actual cuente.
  const liveTop3 = useMemo(() => getDensePodiumNames(standings, 3), [standings]);
  const { podiumMs, legend, movement } = useMemo(
    () => computePodiumAndMovement(matches, participants, nowTs, liveTop3),
    [matches, participants, nowTs, liveTop3]
  );

  const displayVisitStats = useMemo(() => {
    if (!visitStats) return null;
    const startedMatches = matches.filter(match => {
      if (match.status !== 'SCHEDULED') return true;
      if (!match.kickoff) return false;
      const kickoff = new Date(match.kickoff).getTime();
      return Number.isFinite(kickoff) && kickoff <= nowTs;
    }).length;
    const participantCount = participants.length || 24;
    const calculatedBaseline = 100 + (participantCount * Math.max(1, startedMatches));
    const baseline = visitStats.estimatedBaseline > 0
      ? visitStats.estimatedBaseline
      : calculatedBaseline;

    return {
      ...visitStats,
      estimatedBaseline: baseline,
      totalVisits: baseline + visitStats.trackedVisits,
      estimatedFormula: `100 enviados + ${participantCount} participantes × ${Math.max(1, startedMatches)} partidos iniciados`
    };
  }, [matches, nowTs, participants.length, visitStats]);

  // Refresca el reloj cada 15 s para que el "tiempo en podio" se sienta vivo.
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Desbloquea el audio con la PRIMERA interacción del usuario (cualquier toque/clic),
  // para que las porras (propias y las de otros) puedan sonar en iPhone/Safari.
  useEffect(() => {
    const onFirst = () => {
      unlockSounds();
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
    window.addEventListener('pointerdown', onFirst, { once: true });
    window.addEventListener('keydown', onFirst, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const stats = await pingVisitStats();
        if (!cancelled) setVisitStats(stats);
      } catch (error) {
        console.error('No pude actualizar visitas:', error);
      }
    };
    ping();
    const id = setInterval(ping, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Celebración cuando cambia el líder del podio.
  // Solo si el líder tiene ventaja REAL (no empatado en puntos con el 2º),
  // así no se dispara por oscilaciones de desempate durante un partido en vivo.
  useEffect(() => {
    const leader = standings[0];
    if (!leader || leader.points === 0) return;
    const undisputed = leader.points > (standings[1]?.points ?? -1);
    if (prevLeaderRef.current && prevLeaderRef.current !== leader.name && undisputed) {
      celebratePodium();
      triggerToast('👑 ¡Nuevo líder!', `${leader.name} toma la cima de la quiniela con ${leader.points} puntos.`);
      pushChatMessage('Sistema', `👑 ¡${leader.name} es el nuevo líder de la quiniela con ${leader.points} puntos!`, true);
      enqueueOverlay({ type: 'leader_change', payload: { name: leader.name, points: leader.points } });
    }
    // Solo recordamos al líder cuando es indiscutido, para detectar el próximo cambio real
    if (undisputed) prevLeaderRef.current = leader.name;
  }, [standings, triggerToast, pushChatMessage, enqueueOverlay]);

  // Simulate a chat message from coworkers (solo en simulación)
  const addRandomChatComment = useCallback((scoringTeam, opponentTeam) => {
    const users = participants.map(p => p.name);
    const randomUser = users[Math.floor(Math.random() * users.length)] || 'Oficina';

    const goalPhrases = [
      `¡Grande ${scoringTeam}! Ese gol me acomoda la quiniela. 😎`,
      `¡Nooooo! Tenía el empate de ${opponentTeam}. Qué mala suerte. 😭`,
      `¿Vieron ese golazo? ¡Espectacular!`,
      `¡Gooool de ${scoringTeam}! Nos pusimos intensos.`,
      `Esto se está moviendo demasiado, ¡la tabla está que arde! ⚡`
    ];
    const phrase = goalPhrases[Math.floor(Math.random() * goalPhrases.length)];
    pushChatMessage(randomUser, phrase, true);
  }, [participants, pushChatMessage]);

  // Live match simulator effect (modo demo desde #admin)
  useEffect(() => {
    if (simActive) {
      setMatches(prevMatches =>
        prevMatches.map(m => m.status === 'SCHEDULED' ? { ...m, status: 'LIVE', minute: 1, homeScore: 0, awayScore: 0 } : m)
      );

      setTimeout(() => {
        triggerToast('Modo demo', 'Simulación activa. La sincronización real se pausa hasta que la detengas.');
      }, 0);

      simIntervalRef.current = setInterval(() => {
        setMatches(prevMatches => {
          let updatedMatches = prevMatches.map(m => {
            if (m.status !== 'LIVE') return m;

            const nextMinute = m.minute + 3;
            let nextStatus = 'LIVE';
            let nextHome = m.homeScore;
            let nextAway = m.awayScore;

            if (nextMinute >= 90) {
              nextStatus = 'FINISHED';
            }

            const isGoal = Math.random() < 0.15;
            if (isGoal && nextStatus === 'LIVE') {
              const isHome = Math.random() < 0.5;
              if (isHome) {
                nextHome += 1;
                triggerToast('⚽ ¡GOOOL!', `${m.homeTeam} ${nextHome} - ${nextAway} ${m.awayTeam} (${nextMinute}')`);
                addRandomChatComment(m.homeTeam, m.awayTeam);
              } else {
                nextAway += 1;
                triggerToast('⚽ ¡GOOOL!', `${m.homeTeam} ${nextHome} - ${nextAway} ${m.awayTeam} (${nextMinute}')`);
                addRandomChatComment(m.awayTeam, m.homeTeam);
              }
              celebrateGoal();
            }

            return {
              ...m,
              minute: nextMinute > 90 ? 90 : nextMinute,
              status: nextStatus,
              homeScore: nextHome,
              awayScore: nextAway,
              displayClock: `${nextMinute > 90 ? 90 : nextMinute}'`
            };
          });

          const anyLiveSim = updatedMatches.some(m => m.status === 'LIVE');
          if (!anyLiveSim) {
            setSimActive(false);
            triggerToast('Demo concluida', 'Todos los partidos simulados terminaron.');
          }

          return updatedMatches;
        });
      }, 2000);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    }

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [addRandomChatComment, setMatches, simActive, triggerToast]);

  const handleManualChatMessage = (text) => {
    pushChatMessage('Tú', text);
  };

  // Porra lanzada desde el muro: anima local, lo deja en el muro y lo emite al
  // bus para que TODOS los navegadores lo vean (Fase 1).
  const handleReaction = useCallback((type) => {
    unlockSounds(); // desbloquea el audio con esta interacción directa (iPhone/Safari)
    celebrateReaction(type);
    pushChatMessage('Tú', `lanzó una porra ${REACTION_EMOJI[type] || '🎉'}`, true);
    postEvent({ type: 'reaction', payload: { reaction: type, user: 'Alguien' } });
  }, [pushChatMessage]);

  const handlePodiumReaction = useCallback(async (target, reaction) => {
    unlockSounds();
    const copy = PODIUM_REACTION_COPY[reaction] || 'reaccionaste al podio de';
    celebratePodiumReaction(reaction);
    setPodiumReactions(prev => {
      const bucket = prev[target] || {};
      return {
        ...prev,
        [target]: {
          ...bucket,
          [reaction]: Number(bucket[reaction] || 0) + 1,
          lastReactedAt: new Date().toISOString()
        }
      };
    });
    pushChatMessage('Tú', `${copy} ${target}.`, true);
    await postPodiumReaction({ target, reaction });
  }, [pushChatMessage]);

  const handleReset = () => {
    setMatches(initialMatches);
    setParticipantsState([]);
    setDocumentsState([]);
    setPodiumReactions({});
    sharedDataRef.current = { participants: [], documents: [] };
    persistSharedData({ participants: [], documents: [] });
    setChatMessages([
      { id: 1, user: 'Sistema', time: nowTimeStr(), text: 'Quiniela restablecida. Sincronizando resultados reales… 🔄' }
    ]);
    setSimActive(false);
    setTimeout(() => syncNow({ silent: false }), 400);
  };

  const handleLogout = () => {
    logout();
    setSession(null);
    setSimActive(false);
    goToTab('dashboard');
  };

  const liveCount = matches.filter(m => m.status === 'LIVE').length;
  const lastSyncLabel = syncState.lastSync
    ? syncState.lastSync.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className={`app-container ${activeTab === 'dashboard' ? 'dashboard-active' : ''} ${activeTab === 'capitalHumano' ? 'archive-active' : ''} ${activeTab === 'nuevaQuiniela' ? 'nuevaQuiniela-active' : ''}`}>
      {/* Toast Goal Alerts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-desc">{t.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overlay global de animaciones (gol, nuevo líder, marcador exacto…) */}
      <GlobalEventOverlay queue={overlayQueue} onConsume={consumeOverlay} />

      {/* Navigation Header */}
      <header className="nav-header">
        <div className="header-stripe" aria-hidden="true" />
        <div className="header-inner">
          <div className="brand-section">
            <div className="brand-mark">
              <Trophy size={26} className="brand-trophy" />
              <div className="brand-words">
                <span className="brand-top">QUINIELA</span>
                <span className="brand-bottom">MUNDIAL <em>26</em></span>
              </div>
            </div>
            <span className="brand-badge">Canadá · México · USA</span>
          </div>

          {displayVisitStats && (
            <div className="visit-chip" title={`${displayVisitStats.totalVisits} visitas estimadas · ${displayVisitStats.activeClients} activos ahora`}>
              <Users size={13} />
              <span>{displayVisitStats.totalVisits.toLocaleString('es-MX')}</span>
              <span className="visit-chip-live">{displayVisitStats.activeClients}</span>
            </div>
          )}

          <nav className="nav-tabs">
            <button
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => goToTab('dashboard')}
              aria-label="Tabla General"
              title="Tabla General"
            >
              <Trophy size={15} />
              <span className="nav-btn-text">
                <span className="desktop-label">Tabla General</span>
                <span className="mobile-label">Tabla</span>
              </span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'predictions' ? 'active' : ''}`}
              onClick={() => goToTab('predictions')}
              aria-label="Pronósticos"
              title="Pronósticos"
            >
              <Users size={15} />
              <span className="nav-btn-text">
                <span className="desktop-label">Pronósticos</span>
                <span className="mobile-label">Pronóst.</span>
              </span>
            </button>
            <button
              className={`nav-btn nav-btn-matches ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => goToTab('matches')}
              aria-label="Partidos"
              title="Partidos"
            >
              <MonitorPlay size={15} />
              <span className="nav-btn-text nav-btn-text-matches">
                <span className="desktop-label">Partidos</span>
              </span>
              {liveCount > 0 && <span className="nav-live-count">{liveCount}</span>}
            </button>
            {continuationSettings?.publicEnabled !== false && (
              <button
                className={`nav-btn nav-btn-newq ${activeTab === 'nuevaQuiniela' ? 'active' : ''}`}
                onClick={() => goToTab('nuevaQuiniela')}
                aria-label="Nueva Quiniela"
                title="Nueva Quiniela"
              >
                <Users size={15} />
                <span className="nav-btn-text">
                  <span className="desktop-label">Nueva quiniela</span>
                  <span className="mobile-label">Nueva</span>
                </span>
              </button>
            )}
            {showRhArchiveTab && (
              <button
                className={`nav-btn nav-btn-rh-archive ${activeTab === 'capitalHumano' ? 'active' : ''}`}
                onClick={() => goToTab('capitalHumano')}
                aria-label="Resultados Quiniela RH"
                title="Resultados Quiniela RH"
              >
                <Trophy size={15} />
                <span className="nav-btn-text">
                  <span className="desktop-label">Resultados Quiniela RH</span>
                  <span className="mobile-label">Quiniela RH</span>
                </span>
              </button>
            )}
          </nav>

          <div className="header-status">
            {session && pendingAdminCount > 0 && (
              <button
                className="admin-pending-chip"
                onClick={() => goToTab('admin')}
                title="Ir a bandeja de revisión"
              >
                Admin · {pendingAdminCount} pendiente{pendingAdminCount !== 1 ? 's' : ''}
              </button>
            )}
            {liveCount > 0 && (
              <span className="header-live-pill">
                <span className="live-dot" /> {liveCount} en vivo
              </span>
            )}
            <button
              className={`sync-chip ${syncState.status}`}
              onClick={() => syncNow({ silent: false })}
              title={`Última sincronización: ${lastSyncLabel}`}
            >
              {syncState.status === 'error'
                ? <WifiOff size={13} />
                : syncState.status === 'syncing'
                  ? <RefreshCw size={13} className="spin" />
                  : <Wifi size={13} />}
              <span>{lastSyncLabel}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Simulation Active Banner */}
      {simActive && (
        <div className="sim-indicator-bar">
          <div className="sim-status">
            <span className="live-dot"></span>
            Modo demo activo — la sincronización real está en pausa
          </div>
          <button className="btn-stop-sim" onClick={() => setSimActive(false)}>
            <Square size={12} /> Detener
          </button>
        </div>
      )}

      <MatchTicker matches={matches} />

      {continuationSettings && (
        <RhTransitionPopup
          settings={continuationSettings}
          activeTab={activeTab}
          goToTab={goToTab}
          isAdmin={activeTab === 'admin'}
          hasArchive={Boolean(capitalHumanoArchive)}
        />
      )}

      {/* Main View Container */}
      <main className="main-content-area">
        {activeTab === 'dashboard' && (
          <Dashboard
            standings={standings}
            matches={matches}
            chatMessages={chatMessages}
            support={support}
            podiumReactions={podiumReactions}
            movement={movement}
            podiumMs={podiumMs}
            legend={legend}
            onSendMessage={handleManualChatMessage}
            onReaction={handleReaction}
            onPodiumReaction={handlePodiumReaction}
            onOpenPredictionsForMatch={openPredictionsForMatch}
            dashboardMode={dashboardMode}
            dashboardTitle={dashboardTitle}
            onGoNewQuiniela={() => goToTab('nuevaQuiniela')}
          />
        )}
        {activeTab === 'predictions' && (
          <div className="page-card">
            <h2 className="section-title">
              <Users size={20} />
              Pronósticos
            </h2>
            <p className="prediction-page-subtitle">
              Consulta qué marcador apostó la oficina para el partido actual o el siguiente.
            </p>
            <PredictionGrid
              matches={matches}
              phaseMatches={phaseMatches}
              participants={predictionParticipants}
              dashboardMode={dashboardMode}
              activeWindow={activePredictionWindow}
            />
          </div>
        )}
        {activeTab === 'matches' && (
          <LiveMatches matches={matches} />
        )}
        {activeTab === 'nuevaQuiniela' && (
          <NewQuinielaPage
            matches={matches}
            settings={continuationSettings || {}}
          />
        )}
        {activeTab === 'capitalHumano' && (
          <CapitalHumanoArchive initialArchive={capitalHumanoArchive} fallbackStandings={rhStandings} onGoNew={() => goToTab('nuevaQuiniela')} />
        )}
        {activeTab === 'admin' && (
          session ? (
            <Suspense fallback={<div className="page-card admin-loading">Cargando panel…</div>}>
              <AdminPanel
                matches={matches}
                participants={participants}
                standings={rhStandings}
                setParticipants={setSharedParticipants}
                documents={documents}
                setDocuments={setSharedDocuments}
                simActive={simActive}
                setSimActive={setSimActive}
                handleReset={handleReset}
                onSyncNow={() => syncNow({ silent: false })}
                syncState={syncState}
                session={session}
                visitStats={displayVisitStats}
                onLogout={handleLogout}
                phaseSubmissions={phaseSubmissions}
                predictionWindows={predictionWindows}
                continuationSettings={continuationSettings}
                onSettingsSaved={loadSharedData}
              />
            </Suspense>
          ) : (
            <AdminLogin onLogin={setSession} onBack={() => goToTab('dashboard')} />
          )
        )}
      </main>

      <footer className="app-footer">
        Quiniela interna · Mundial FIFA 26 · Datos en vivo vía feed público de ESPN by Roby
      </footer>
    </div>
  );
}
