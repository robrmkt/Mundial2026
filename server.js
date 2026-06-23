import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, 'dist');
const dataDir = process.env.DATA_DIR || resolve(__dirname, 'data');
const stateFile = resolve(dataDir, 'shared-state.json');
const avatarsDir = resolve(dataDir, 'avatars');
const port = Number(process.env.PORT) || 4173;

// Estado compartido ampliado (V4). Cada colección nueva es opcional y arranca
// vacía: NUNCA debe pisar `participants`/`documents` existentes. La fuente de la
// verdad es este archivo; sin volumen persistente en Railway se borra al redeploy.
const defaultState = {
  participants: [],
  documents: [],
  events: [],
  luckWishes: [],
  boos: [],
  support: {},
  podiumReactions: {},
  rankingSnapshots: [],
  podiumHistory: {},
  leaderHistory: [],
  lastProcessedFeedEvents: {},
  userActivity: {},
  visitStats: {
    estimatedBaseline: 0,
    totalVisits: 0,
    uniqueClients: 0,
    firstTrackedAt: null,
    lastVisitAt: null
  },
  updatedAt: null
};

// Límites de limpieza para que el JSON no crezca sin control.
const LIMITS = {
  events: 200,
  rankingSnapshots: 30,
  leaderHistory: 50,
  luckWindowMs: 15 * 60 * 1000, // la suerte dura 15 minutos
  booWindowMs: 5 * 60 * 1000,   // los abucheos viven 5 minutos
  dedupeWindowMs: 60 * 1000     // mismo dedupeKey en <1 min = duplicado
};

const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const DEFAULT_VISIT_BASELINE = Number(process.env.VISIT_BASELINE || 0);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function ensureDataFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(avatarsDir)) mkdirSync(avatarsDir, { recursive: true });
  if (!existsSync(stateFile)) {
    writeFileSync(stateFile, JSON.stringify(defaultState, null, 2));
  }
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const asArray = (v) => (Array.isArray(v) ? v : []);
const asObject = (v) => (isObject(v) ? v : {});
const toMs = (v) => (typeof v === 'number' ? v : Date.parse(v) || 0);

// Normaliza cualquier objeto a la forma completa del estado, sin perder colecciones.
function coerceState(parsed) {
  const p = isObject(parsed) ? parsed : {};
  return {
    participants: asArray(p.participants),
    documents: asArray(p.documents),
    events: asArray(p.events),
    luckWishes: asArray(p.luckWishes),
    boos: asArray(p.boos),
    support: asObject(p.support),
    podiumReactions: asObject(p.podiumReactions),
    rankingSnapshots: asArray(p.rankingSnapshots),
    podiumHistory: asObject(p.podiumHistory),
    leaderHistory: asArray(p.leaderHistory),
    lastProcessedFeedEvents: asObject(p.lastProcessedFeedEvents),
    userActivity: asObject(p.userActivity),
    visitStats: {
      estimatedBaseline: Number(p.visitStats?.estimatedBaseline ?? DEFAULT_VISIT_BASELINE) || 0,
      totalVisits: Number(p.visitStats?.totalVisits || 0),
      uniqueClients: Number(p.visitStats?.uniqueClients || 0),
      firstTrackedAt: p.visitStats?.firstTrackedAt || null,
      lastVisitAt: p.visitStats?.lastVisitAt || null
    },
    updatedAt: p.updatedAt || null
  };
}

function readState() {
  ensureDataFile();
  try {
    return coerceState(JSON.parse(readFileSync(stateFile, 'utf8')));
  } catch (error) {
    console.error('Unable to read shared state:', error);
    return coerceState(defaultState);
  }
}

// Aplica los topes/ventanas de limpieza. Se corre en cada escritura.
function pruneState(state) {
  const now = Date.now();
  return {
    ...state,
    events: state.events.slice(-LIMITS.events),
    luckWishes: state.luckWishes.filter(w => now - toMs(w.createdAt) <= LIMITS.luckWindowMs),
    boos: state.boos.filter(b => now - toMs(b.createdAt) <= LIMITS.booWindowMs),
    rankingSnapshots: state.rankingSnapshots.slice(-LIMITS.rankingSnapshots),
    leaderHistory: state.leaderHistory.slice(-LIMITS.leaderHistory)
  };
}

function writeState(nextState) {
  ensureDataFile();
  const merged = pruneState(coerceState(nextState));
  merged.updatedAt = new Date().toISOString();
  writeFileSync(stateFile, JSON.stringify(merged, null, 2));
  return merged;
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function visitSummary(state) {
  const now = Date.now();
  const activity = asObject(state.userActivity);
  const activeClients = Object.values(activity).filter(entry =>
    now - toMs(entry?.lastSeenAt) <= ACTIVE_WINDOW_MS
  ).length;
  const stats = state.visitStats || {};
  return {
    estimatedBaseline: Number(stats.estimatedBaseline || 0),
    trackedVisits: Number(stats.totalVisits || 0),
    totalVisits: Number(stats.estimatedBaseline || 0) + Number(stats.totalVisits || 0),
    uniqueClients: Number(stats.uniqueClients || 0),
    activeClients,
    firstTrackedAt: stats.firstTrackedAt || null,
    lastVisitAt: stats.lastVisitAt || null,
    serverTime: new Date().toISOString()
  };
}

function recordVisit(raw = {}) {
  const base = readState();
  const nowIso = new Date().toISOString();
  const clientId = String(raw.clientId || '').slice(0, 80) || makeId('anon');
  const activity = { ...base.userActivity };
  const previous = activity[clientId];
  const isNewClient = !previous;
  const isNewVisit = !previous || (Date.now() - toMs(previous.lastVisitAt || previous.lastSeenAt)) > 30 * 60 * 1000;

  activity[clientId] = {
    firstSeenAt: previous?.firstSeenAt || nowIso,
    lastSeenAt: nowIso,
    lastVisitAt: isNewVisit ? nowIso : (previous?.lastVisitAt || nowIso),
    hits: Number(previous?.hits || 0) + 1
  };

  const visitStats = {
    ...base.visitStats,
    estimatedBaseline: Number(base.visitStats?.estimatedBaseline ?? DEFAULT_VISIT_BASELINE) || 0,
    totalVisits: Number(base.visitStats?.totalVisits || 0) + (isNewVisit ? 1 : 0),
    uniqueClients: Number(base.visitStats?.uniqueClients || 0) + (isNewClient ? 1 : 0),
    firstTrackedAt: base.visitStats?.firstTrackedAt || nowIso,
    lastVisitAt: nowIso
  };

  const saved = writeState({ ...base, userActivity: activity, visitStats });
  return visitSummary(saved);
}

// ---- Fotos a disco (Fase 2): base64 -> archivo en el volumen /data/avatars ----
function slugName(name) {
  return String(name || 'p')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'p';
}

function shortHash(s) {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}

// Si participant.photo es un Data URL base64, lo guarda como archivo y reemplaza
// la foto por la ruta /avatars/<archivo>. Si ya es una ruta, lo deja igual.
function persistAvatar(participant) {
  const p = participant;
  if (!p || typeof p.photo !== 'string' || !p.photo.startsWith('data:image')) return p;
  const match = p.photo.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
  if (!match) return p;
  try {
    ensureDataFile();
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const file = `${slugName(p.name)}-${shortHash(p.name)}.${ext}`;
    writeFileSync(resolve(avatarsDir, file), Buffer.from(match[2], 'base64'));
    return { ...p, photo: `/avatars/${file}` };
  } catch (error) {
    console.error('No pude guardar el avatar de', p?.name, error);
    return p; // ante la duda, conservamos el base64 (no perdemos la foto)
  }
}

// Migra al inicio cualquier foto base64 que aún viva dentro del JSON.
function migrateBase64Avatars() {
  const state = readState();
  let changed = false;
  const participants = state.participants.map(p => {
    if (typeof p.photo === 'string' && p.photo.startsWith('data:image')) {
      changed = true;
      return persistAvatar(p);
    }
    return p;
  });
  if (changed) {
    writeState({ ...state, participants });
    console.log('Avatares base64 migrados a /avatars.');
  }
}

// ---- Canal de eventos compartido (el "bus" que ven todos los navegadores) ----

function appendEvent(state, rawEvent) {
  const now = Date.now();
  const event = {
    id: rawEvent.id || makeId('evt'),
    type: rawEvent.type || 'generic',
    dedupeKey: rawEvent.dedupeKey || '',
    payload: asObject(rawEvent.payload),
    createdAt: new Date().toISOString()
  };
  // Dedupe: mismo dedupeKey dentro de la ventana corta => lo descartamos.
  if (event.dedupeKey) {
    const dupe = state.events.some(e =>
      e.dedupeKey && e.dedupeKey === event.dedupeKey &&
      now - toMs(e.createdAt) <= LIMITS.dedupeWindowMs
    );
    if (dupe) return { state, event: null, deduped: true };
  }
  return { state: { ...state, events: [...state.events, event] }, event, deduped: false };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      // Las fotos de los participantes (base64) viajan en este payload, así que
      // damos margen amplio (cada foto comprimida pesa ~25-40 KB).
      if (body.length > 16_000_000) {
        request.destroy();
        rejectBody(new Error('Payload too large'));
      }
    });
    request.on('end', () => resolveBody(body));
    request.on('error', rejectBody);
  });
}

async function readJsonBody(request) {
  const body = await readBody(request);
  return JSON.parse(body || '{}');
}

function serveAvatar(response, requestedPath) {
  const name = normalize(requestedPath.replace(/^\/avatars\//, ''));
  const filePath = resolve(avatarsDir, `./${name}`);
  if (!filePath.startsWith(avatarsDir) || !existsSync(filePath)) {
    sendJson(response, 404, { error: 'Avatar not found' });
    return;
  }
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400'
  });
  createReadStream(filePath).pipe(response);
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = normalize(decodeURIComponent(url.pathname));

  // Las fotos subidas por el admin se guardan en el volumen, fuera de /dist.
  if (requestedPath.startsWith('/avatars/')) {
    serveAvatar(response, requestedPath);
    return;
  }

  const filePath = requestedPath === '/'
    ? join(distDir, 'index.html')
    : resolve(distDir, `.${requestedPath}`);

  if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
    const fallback = join(distDir, 'index.html');
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    createReadStream(fallback).pipe(response);
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream'
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const path = url.pathname;

    // ---- Estado completo (participantes, documentos y todo lo demás) ----
    if (path === '/api/state') {
      if (request.method === 'GET') {
        sendJson(response, 200, readState());
        return;
      }
      if (request.method === 'PUT') {
        const parsed = await readJsonBody(request);
        // Las fotos base64 que lleguen se guardan como archivo (volumen) y se
        // reemplazan por su ruta /avatars, para no inflar el JSON.
        if (Array.isArray(parsed.participants)) {
          parsed.participants = parsed.participants.map(persistAvatar);
        }
        // Merge superficial sobre el estado actual: un PUT parcial (p.ej. solo
        // {participants}) conserva el resto de colecciones intactas.
        sendJson(response, 200, writeState({ ...readState(), ...parsed }));
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    // ---- Bus de eventos: GET lee desde un timestamp, POST publica uno ----
    if (path === '/api/events') {
      if (request.method === 'GET') {
        const sinceRaw = url.searchParams.get('since');
        const since = sinceRaw ? toMs(sinceRaw) : 0;
        const state = readState();
        const events = since
          ? state.events.filter(e => toMs(e.createdAt) > since)
          : state.events.slice(-50);
        sendJson(response, 200, { events, serverTime: new Date().toISOString() });
        return;
      }
      if (request.method === 'POST') {
        const parsed = await readJsonBody(request);
        const { state, event, deduped } = appendEvent(readState(), parsed.event || parsed);
        if (!deduped) writeState(state);
        sendJson(response, 200, { event, deduped, serverTime: new Date().toISOString() });
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    // ---- Visitas anónimas: contador histórico + usuarios activos ----
    if (path === '/api/visits') {
      if (request.method === 'GET') {
        sendJson(response, 200, visitSummary(readState()));
        return;
      }
      if (request.method === 'POST') {
        const parsed = await readJsonBody(request);
        sendJson(response, 200, recordVisit(parsed));
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    // ---- Suerte (tréboles) a un participante: dura 15 min + emite evento ----
    if (path === '/api/luck' && request.method === 'POST') {
      const { target, clientId } = await readJsonBody(request);
      const base = readState();
      const wish = {
        id: makeId('luck'),
        target: String(target || ''),
        clientId: String(clientId || ''),
        createdAt: new Date().toISOString()
      };
      const withWish = { ...base, luckWishes: [...base.luckWishes, wish] };
      const { state, event } = appendEvent(withWish, {
        type: 'luck',
        dedupeKey: `luck|${wish.target}|${wish.clientId}|${Math.floor(Date.now() / 5000)}`,
        payload: { target: wish.target }
      });
      const saved = writeState(state);
      const count = saved.luckWishes.filter(w => w.target === wish.target).length;
      sendJson(response, 200, { wish, count, event });
      return;
    }

    // ---- Apoyo a un equipo de un partido (taps agrupados en el cliente) ----
    if (path === '/api/support' && request.method === 'POST') {
      const { matchId, side, amount } = await readJsonBody(request);
      const base = readState();
      const key = String(matchId);
      const bucket = asObject(base.support[key]);
      const add = Number.isFinite(Number(amount)) ? Math.max(1, Math.min(50, Number(amount))) : 1;
      const nextBucket = {
        home: Number(bucket.home || 0) + (side === 'home' ? add : 0),
        away: Number(bucket.away || 0) + (side === 'away' ? add : 0)
      };
      const saved = writeState({ ...base, support: { ...base.support, [key]: nextBucket } });
      sendJson(response, 200, { matchId: key, support: saved.support[key] });
      return;
    }

    // ---- Termómetro del podio: reacciones históricas por persona ----
    if (path === '/api/podium-reaction' && request.method === 'POST') {
      const { target, reaction, clientId } = await readJsonBody(request);
      const safeTarget = String(target || '').slice(0, 120);
      const safeReaction = String(reaction || '');
      const allowed = new Set(['bank', 'suspect', 'salt']);
      if (!safeTarget || !allowed.has(safeReaction)) {
        sendJson(response, 400, { error: 'Invalid podium reaction' });
        return;
      }
      const base = readState();
      const bucket = asObject(base.podiumReactions[safeTarget]);
      const count = Math.max(0, Number(bucket[safeReaction] || 0)) + 1;
      const nextBucket = { ...bucket, [safeReaction]: count, lastReactedAt: new Date().toISOString() };
      const withReaction = {
        ...base,
        podiumReactions: { ...base.podiumReactions, [safeTarget]: nextBucket }
      };
      const { state, event } = appendEvent(withReaction, {
        type: 'podium_reaction',
        dedupeKey: `podium|${safeTarget}|${safeReaction}|${String(clientId || '')}|${Math.floor(Date.now() / 3000)}`,
        payload: { target: safeTarget, reaction: safeReaction }
      });
      const saved = writeState(state);
      sendJson(response, 200, { target: safeTarget, reactions: saved.podiumReactions[safeTarget], event });
      return;
    }

    // ---- Abucheo a un equipo (nunca a personas): vive 5 min + emite evento ----
    if (path === '/api/boo' && request.method === 'POST') {
      const { matchId, team, clientId } = await readJsonBody(request);
      const base = readState();
      const boo = {
        id: makeId('boo'),
        matchId: String(matchId || ''),
        team: String(team || ''),
        clientId: String(clientId || ''),
        createdAt: new Date().toISOString()
      };
      const withBoo = { ...base, boos: [...base.boos, boo] };
      const { state, event } = appendEvent(withBoo, {
        type: 'boo',
        dedupeKey: `boo|${boo.matchId}|${boo.team}|${boo.clientId}|${Math.floor(Date.now() / 3000)}`,
        payload: { team: boo.team, matchId: boo.matchId }
      });
      const saved = writeState(state);
      const count = saved.boos.filter(b => b.matchId === boo.matchId && b.team === boo.team).length;
      sendJson(response, 200, { boo, count, event });
      return;
    }

    // ---- Snapshot del ranking (para flechas de movimiento ▲▼) ----
    if (path === '/api/ranking-snapshot' && request.method === 'POST') {
      const { snapshot } = await readJsonBody(request);
      const base = readState();
      const entry = {
        id: makeId('snap'),
        createdAt: new Date().toISOString(),
        ranking: asArray(snapshot) // [{ name, rank, points }]
      };
      const saved = writeState({ ...base, rankingSnapshots: [...base.rankingSnapshots, entry] });
      sendJson(response, 200, { snapshot: entry, total: saved.rankingSnapshots.length });
      return;
    }

    // ---- Tiempo acumulado en el podio (Modo Leyenda) ----
    // Mide el tiempo desde el ÚLTIMO tick (de cualquier navegador), así varios
    // clientes no duplican el conteo. Solo suma a quien está en el top 3 ahora.
    if (path === '/api/podium-tick' && request.method === 'POST') {
      const { top3 } = await readJsonBody(request);
      const base = readState();
      const ph = { ...base.podiumHistory };
      const now = Date.now();
      const MAX_GAP = 5 * 60 * 1000; // no acumular más de 5 min por tick
      const elapsed = Math.min(Math.max(0, now - (ph._lastTick || now)), MAX_GAP);
      const prevTop3 = Array.isArray(ph._prevTop3) ? ph._prevTop3 : [];
      const names = (Array.isArray(top3) ? top3 : []).filter(Boolean).map(String);
      names.forEach(name => {
        const e = (ph[name] && typeof ph[name] === 'object') ? { ...ph[name] } : { totalMs: 0, entries: 0 };
        e.totalMs = (e.totalMs || 0) + elapsed;
        if (!prevTop3.includes(name)) e.entries = (e.entries || 0) + 1;
        e.lastSeenAt = new Date(now).toISOString();
        ph[name] = e;
      });
      ph._lastTick = now;
      ph._prevTop3 = names;
      const saved = writeState({ ...base, podiumHistory: ph });
      sendJson(response, 200, { podiumHistory: saved.podiumHistory });
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error' });
  }
});

ensureDataFile();
migrateBase64Avatars();

server.listen(port, '0.0.0.0', () => {
  console.log(`Quiniela server listening on ${port}`);
});
