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
const defaultNotificationSettings = {
  enabled: false,
  mode: 'off', // off | test | production
  testRecipient: 'roberto.tejeda@bacherzoppi.com',
  adminRecipient: 'roberto.tejeda@bacherzoppi.com',
  replyTo: '',
  updatedAt: null,
  updatedBy: null,
  templates: {
    exactScore: {
      enabled: true,
      label: 'Marcador exacto',
      trigger: 'Cuando un participante acierta marcador exacto',
      subject: '🎯 Marcador exacto en la quiniela',
      previewText: 'Acertaste un marcador exacto y sumaste puntos.',
      audience: 'participant',
      cooldownMinutes: 10
    },
    podiumEnter: {
      enabled: true,
      label: 'Entrada al podio',
      trigger: 'Cuando un participante entra al Top 3',
      subject: '🏆 Entraste al podio de la quiniela',
      previewText: 'Ya estás entre los primeros lugares.',
      audience: 'participant',
      cooldownMinutes: 30
    },
    phaseOpen: {
      enabled: false,
      label: 'Nueva fase disponible',
      trigger: 'Cuando se abre una ventana de pronóstico',
      subject: '⚽ Ya puedes completar la siguiente fase',
      previewText: 'La nueva ronda de pronósticos ya está disponible.',
      audience: 'allParticipants',
      cooldownMinutes: 0
    },
    phaseReminder: {
      enabled: false,
      label: 'Recordatorio de cierre',
      trigger: 'Antes de que cierre una ventana o partido',
      subject: '⏰ Últimas horas para enviar tus pronósticos',
      previewText: 'Recuerda completar tu quiniela antes del cierre.',
      audience: 'pendingParticipants',
      cooldownMinutes: 0
    },
    phaseConfirmation: {
      enabled: true,
      label: 'Confirmación de envío',
      trigger: 'Cuando un participante envía una nueva fase',
      subject: '✅ Recibimos tus pronósticos',
      previewText: 'Tu quiniela de la siguiente fase fue registrada.',
      audience: 'participant',
      cooldownMinutes: 0
    },
    adminNewSubmission: {
      enabled: true,
      label: 'Nuevo registro para revisar',
      trigger: 'Cuando un usuario envía pronósticos de Nueva Quiniela',
      subject: '📝 Nueva quiniela pendiente de revisión',
      previewText: 'Un participante envió pronósticos y espera aprobación.',
      audience: 'admin',
      cooldownMinutes: 0
    }
  }
};

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
  predictionWindows: [],
  phaseSubmissions: [],
  phaseProgress: [],
  continuationSettings: {
    enabled: true,
    publicEnabled: true,
    registrationEnabled: true,
    title: 'Nueva Quiniela',
    subtitle: 'Continúa pronosticando los siguientes partidos del Mundial.',
    startAt: '2026-06-28T00:00:00-06:00',
    lockMinutesBeforeKickoff: 10,
    dashboardMode: 'auto',
    defaultDashboardAfterStart: 'new_quiniela',
    scoringMode: 'phase_only',
    allowNewUsers: true,
    allowedDomains: ['bacherzoppi.com', 'uppharma.com'],
    autoApproveSubmissions: false,
    transitionNoticeEnabled: true,
    transitionNoticeVersion: 1,
    transitionPopup: {
      enabled: true,
      version: 1,
      maxViews: 2,
      startsAt: '2026-06-26T00:00:00-06:00',
      afterCloseAt: '2026-06-28T00:00:00-06:00',
      endsAt: '2026-07-02T23:59:00-06:00',
      beforeClose: {
        title: 'La Quiniela RH está por finalizar',
        body: 'La dinámica de RH cierra con la fase de grupos. Si quieres seguir con la fiebre mundialista, te invitamos a ingresar tus pronósticos para la siguiente fase en la Nueva Quiniela. Es una dinámica interna para seguir disfrutando el Mundial entre todos.',
        primaryCta: 'Ir a Nueva Quiniela',
        secondaryCta: 'Cerrar'
      },
      afterClose: {
        title: 'La Quiniela RH ya finalizó',
        body: 'La dinámica de RH cerró con la fase de grupos y sus resultados quedaron guardados como histórico. Si quieres seguir con la fiebre mundialista, ya puedes participar en la Nueva Quiniela.',
        primaryCta: 'Ir a Nueva Quiniela',
        secondaryCta: 'Ver Quiniela RH',
        tertiaryCta: 'Cerrar'
      }
    },
    emergencyMode: false,
    emergencyMessage: 'Estamos ajustando la nueva quiniela. Intenta de nuevo más tarde.'
  },
  capitalHumanoArchive: null,
  registeredUsers: [],
  notificationSettings: defaultNotificationSettings,
  notificationLog: [],
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
    predictionWindows: asArray(p.predictionWindows),
    phaseSubmissions: asArray(p.phaseSubmissions),
    phaseProgress: asArray(p.phaseProgress),
    continuationSettings: coerceContinuationSettings(p.continuationSettings),
    capitalHumanoArchive: isObject(p.capitalHumanoArchive) ? p.capitalHumanoArchive : null,
    registeredUsers: asArray(p.registeredUsers),
    notificationSettings: coerceNotificationSettings(p.notificationSettings),
    notificationLog: asArray(p.notificationLog).slice(-200),
    updatedAt: p.updatedAt || null
  };
}

function coerceContinuationSettings(raw) {
  const r = isObject(raw) ? raw : {};
  const d = defaultState.continuationSettings;
  const popupRaw = isObject(r.transitionPopup) ? r.transitionPopup : {};
  const popupDefault = d.transitionPopup;
  return {
    ...d,
    ...r,
    allowedDomains: Array.isArray(r.allowedDomains) && r.allowedDomains.length ? r.allowedDomains : d.allowedDomains,
    lockMinutesBeforeKickoff: Number(r.lockMinutesBeforeKickoff ?? d.lockMinutesBeforeKickoff) || d.lockMinutesBeforeKickoff,
    transitionNoticeVersion: Number(r.transitionNoticeVersion ?? d.transitionNoticeVersion) || d.transitionNoticeVersion,
    transitionPopup: {
      ...popupDefault,
      ...popupRaw,
      enabled: typeof popupRaw.enabled === 'boolean' ? popupRaw.enabled : (typeof r.transitionNoticeEnabled === 'boolean' ? r.transitionNoticeEnabled : popupDefault.enabled),
      version: Number(popupRaw.version ?? r.transitionNoticeVersion ?? popupDefault.version) || popupDefault.version,
      maxViews: Number(popupRaw.maxViews ?? popupDefault.maxViews) || popupDefault.maxViews,
      beforeClose: { ...popupDefault.beforeClose, ...(isObject(popupRaw.beforeClose) ? popupRaw.beforeClose : {}) },
      afterClose: { ...popupDefault.afterClose, ...(isObject(popupRaw.afterClose) ? popupRaw.afterClose : {}) }
    }
  };
}

function coerceNotificationSettings(raw) {
  const r = isObject(raw) ? raw : {};
  const defaults = defaultNotificationSettings;
  const templates = {};
  for (const [key, def] of Object.entries(defaults.templates)) {
    const t = isObject(r.templates?.[key]) ? r.templates[key] : {};
    templates[key] = {
      enabled: typeof t.enabled === 'boolean' ? t.enabled : def.enabled,
      label: t.label || def.label,
      trigger: t.trigger || def.trigger,
      subject: t.subject || def.subject,
      previewText: t.previewText || def.previewText,
      audience: t.audience || def.audience,
      cooldownMinutes: Number(t.cooldownMinutes ?? def.cooldownMinutes)
    };
  }
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : false,
    mode: ['off','test','production'].includes(r.mode) ? r.mode : 'off',
    testRecipient: r.testRecipient || defaults.testRecipient,
    replyTo: r.replyTo || '',
    updatedAt: r.updatedAt || null,
    updatedBy: r.updatedBy || null,
    templates
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
    leaderHistory: state.leaderHistory.slice(-LIMITS.leaderHistory),
    notificationLog: asArray(state.notificationLog).slice(-200)
  };
}

function isValidAdminAction(request) {
  const expected = process.env.ADMIN_ACTION_TOKEN;
  if (!expected) return false;
  const received = request.headers['x-admin-action-token'];
  return received === expected;
}

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: 'provider_missing' };
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const from = process.env.MAIL_FROM || 'Quiniela Mundial 2026 <noreply@example.com>';
    const result = await resend.emails.send({ from, to, subject, html: html || text, text: text || '' });
    return { ok: true, id: result.data?.id };
  } catch (e) {
    return { error: e.message || 'send_failed' };
  }
}

function appendNotificationLog(state, entry) {
  const log = [...asArray(state.notificationLog), entry].slice(-200);
  return { ...state, notificationLog: log };
}

function renderTemplate(template, data) {
  let subject = template.subject || '';
  let body = template.body || '';
  for (const [k, v] of Object.entries(data || {})) {
    const re = new RegExp(`{{${k}}}`, 'g');
    subject = subject.replace(re, v);
    body = body.replace(re, v);
  }
  return { subject, body };
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

function normalizeEmailValue(email) {
  return String(email || '').trim().toLowerCase();
}

function inferTeamFromEmail(email) {
  const e = normalizeEmailValue(email);
  if (e.endsWith('@bacherzoppi.com')) return 'bz';
  if (e.endsWith('@uppharma.com')) return 'up';
  return '';
}

function isEmailAllowed(email, settings) {
  const e = normalizeEmailValue(email);
  return asArray(settings.allowedDomains).some(domain => e.endsWith(`@${String(domain).toLowerCase()}`));
}

function normalizeName(name) {
  return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function findCapitalHumanoHistory({ email, name, archive }) {
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedName = normalizeName(name);
  const standings = asArray(archive?.standings);
  const participants = asArray(archive?.participants);

  const byStanding = standings.find(item =>
    normalizeEmailValue(item.email) === normalizedEmail ||
    (normalizedName && normalizeName(item.name) === normalizedName)
  );
  if (byStanding) {
    return { status: 'available', rank: byStanding.rank || null, points: Number(byStanding.points || 0), exactHits: Number(byStanding.exactHits || 0), outcomeHits: Number(byStanding.outcomeHits || 0) };
  }

  const byParticipant = participants.find(item =>
    normalizeEmailValue(item.email) === normalizedEmail ||
    (normalizedName && normalizeName(item.name) === normalizedName)
  );
  if (byParticipant) {
    return { status: 'available', rank: byParticipant.rank || null, points: Number(byParticipant.points || 0), exactHits: Number(byParticipant.exactHits || 0), outcomeHits: Number(byParticipant.outcomeHits || 0) };
  }

  return { status: archive ? 'not_found' : 'pending_freeze', rank: null, points: 0, exactHits: 0, outcomeHits: 0 };
}

function notifyAdminNewSubmission(entry, state) {
  const ns = state.notificationSettings || defaultNotificationSettings;
  const template = ns.templates?.adminNewSubmission;
  const skipped = !ns.enabled || ns.mode === 'off' || template?.enabled === false;
  const to = ns.mode === 'test' ? ns.testRecipient : (ns.adminRecipient || 'roberto.tejeda@bacherzoppi.com');
  const subject = template?.subject || '📝 Nueva quiniela pendiente de revisión';
  const predCount = Object.keys(entry.predictions || {}).length;
  const baseUrl = process.env.PUBLIC_BASE_URL || '';
  const html = `<p>Hola Roberto,</p>
<p><strong>${entry.participantName || entry.email}</strong> (<code>${entry.email}</code>) acaba de enviar su quiniela con ${predCount} pronóstico${predCount !== 1 ? 's' : ''}.</p>
<p>Estado: <strong>${entry.status || 'pending'}</strong></p>
<p><a href="${baseUrl}/#admin" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Revisar ahora</a></p>`;

  if (skipped) {
    const nextState = appendNotificationLog(state, { type: 'adminNewSubmission', status: 'skipped', mode: ns.mode || 'off', to: '', subject, error: 'notifications_off', at: new Date().toISOString() });
    writeState(nextState);
    return;
  }

  sendEmail({ to, subject, html }).then(result => {
    const base = readState();
    const next = appendNotificationLog(base, { type: 'adminNewSubmission', status: result.ok ? 'sent' : 'failed', mode: ns.mode, to, subject, error: result.error || null, at: new Date().toISOString() });
    writeState(next);
  }).catch(() => {});
}

function getMatchKickoffValue(match) {
  return match?.kickoff || match?.utcDate || match?.dateTime || null;
}

function getMatchLockAtValue(match, lockMinutes) {
  const kickoff = getMatchKickoffValue(match);
  if (!kickoff) return null;
  const ms = Date.parse(kickoff);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms - lockMinutes * 60 * 1000).toISOString();
}

function isConfirmedMatch(match) {
  const home = String(match?.homeTeam || '').trim();
  const away = String(match?.awayTeam || '').trim();
  return Boolean(home && away && !/por definir|tbd|to be determined/i.test(`${home} ${away}`) && getMatchKickoffValue(match));
}

function isSubmissionMatchLocked(match, settings) {
  const lockAt = getMatchLockAtValue(match, settings.lockMinutesBeforeKickoff);
  if (!lockAt) return true;
  return Date.now() >= Date.parse(lockAt);
}

function initials(nameOrEmail) {
  const name = String(nameOrEmail || '').split('@')[0].replace(/[._-]+/g, ' ');
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'NP';
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

    // ---- Configuración de notificaciones (GET público, PUT requiere token) ----
    if (path === '/api/notification-settings') {
      if (request.method === 'GET') {
        const s = readState();
        sendJson(response, 200, s.notificationSettings || defaultNotificationSettings);
        return;
      }
      if (request.method === 'PUT') {
        if (!isValidAdminAction(request)) { sendJson(response, 403, { error: 'Forbidden' }); return; }
        const parsed = await readJsonBody(request);
        const base = readState();
        const merged = coerceNotificationSettings({ ...base.notificationSettings, ...parsed, updatedAt: new Date().toISOString() });
        const saved = writeState({ ...base, notificationSettings: merged });
        sendJson(response, 200, saved.notificationSettings);
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' }); return;
    }

    // ---- Historial de notificaciones ----
    if (path === '/api/notification-log' && request.method === 'GET') {
      const s = readState();
      sendJson(response, 200, { log: asArray(s.notificationLog).slice(-100) });
      return;
    }

    // ---- Envío de prueba manual ----
    if (path === '/api/notifications/test' && request.method === 'POST') {
      if (!isValidAdminAction(request)) { sendJson(response, 403, { error: 'Forbidden' }); return; }
      const { templateKey, testRecipient, sampleData } = await readJsonBody(request);
      const base = readState();
      const settings = base.notificationSettings;
      const template = settings.templates?.[templateKey];
      if (!template) { sendJson(response, 400, { error: 'Unknown template' }); return; }
      const to = testRecipient || settings.testRecipient;
      const subject = `[PRUEBA] ${template.subject}`;
      const text = `Participante: ${sampleData?.participantName || 'Roberto'}\n\n${template.previewText}`;
      const result = await sendEmail({ to, subject, text });
      const logEntry = {
        id: makeId('notif'),
        type: templateKey,
        mode: 'test',
        status: result.ok ? 'sent' : 'error',
        to,
        subject,
        error: result.error || '',
        createdAt: new Date().toISOString()
      };
      writeState(appendNotificationLog(base, logEntry));
      sendJson(response, 200, { logEntry, result });
      return;
    }

    // ---- Trigger de notificación real (desde el frontend, deduplicado) ----
    if (path === '/api/notifications/trigger' && request.method === 'POST') {
      const { type, recipientEmail, participantName, dedupeKey, data } = await readJsonBody(request);
      const base = readState();
      const settings = base.notificationSettings;
      if (!settings.enabled || settings.mode === 'off') {
        const logEntry = { id: makeId('notif'), type: type || 'unknown', mode: 'off', status: 'skipped', to: recipientEmail || '', subject: '', error: 'notifications_disabled', createdAt: new Date().toISOString() };
        writeState(appendNotificationLog(base, logEntry));
        sendJson(response, 200, { skipped: true, reason: 'notifications_disabled' });
        return;
      }
      const template = settings.templates?.[type];
      if (!template?.enabled) {
        sendJson(response, 200, { skipped: true, reason: 'template_disabled' });
        return;
      }
      // Dedupe check
      if (dedupeKey) {
        const recent = asArray(base.notificationLog).find(l => l.dedupeKey === dedupeKey && l.status === 'sent');
        if (recent) { sendJson(response, 200, { skipped: true, reason: 'duplicate' }); return; }
      }
      const rendered = renderTemplate(template, { participantName: participantName || '', ...(isObject(data) ? data : {}) });
      const to = settings.mode === 'test' ? settings.testRecipient : recipientEmail;
      const subject = settings.mode === 'test' ? `[PRUEBA] ${rendered.subject}` : rendered.subject;
      const text = `Hola, ${participantName || ''}.\n\n${rendered.body || template.previewText}`;
      const result = await sendEmail({ to, subject, text });
      const logEntry = {
        id: makeId('notif'),
        type,
        mode: settings.mode,
        status: result.ok ? 'sent' : (result.error === 'provider_missing' ? 'skipped' : 'error'),
        to,
        originalRecipient: recipientEmail || '',
        subject,
        dedupeKey: dedupeKey || '',
        error: result.error || '',
        createdAt: new Date().toISOString()
      };
      writeState(appendNotificationLog(base, logEntry));
      sendJson(response, 200, { logEntry, result });
      return;
    }

    // ---- Ventanas de pronóstico ----
    if (path === '/api/prediction-windows') {
      if (request.method === 'GET') {
        sendJson(response, 200, { windows: asArray(readState().predictionWindows) });
        return;
      }
      if (request.method === 'POST') {
        const parsed = await readJsonBody(request);
        const base = readState();
        const win = {
          id: makeId('win'),
          name: 'Nueva quiniela',
          status: 'draft',
          matchIds: [],
          closeMode: 'per_match',
          lockMinutesBeforeKickoff: base.continuationSettings.lockMinutesBeforeKickoff,
          autoIncludeFutureMatches: true,
          ...parsed,
          createdAt: new Date().toISOString()
        };
        const saved = writeState({ ...base, predictionWindows: [...asArray(base.predictionWindows), win] });
        sendJson(response, 200, { window: win, total: saved.predictionWindows.length });
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' }); return;
    }

    if (path === '/api/continuation/profile' && request.method === 'POST') {
      const { email } = await readJsonBody(request);
      const base = readState();
      const settings = base.continuationSettings;
      const normalizedEmail = normalizeEmailValue(email);
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        sendJson(response, 400, { error: 'invalid_email', message: 'Ingresa un correo válido.' });
        return;
      }
      if (!isEmailAllowed(normalizedEmail, settings)) {
        sendJson(response, 403, { error: 'domain_not_allowed', message: 'Por ahora esta quiniela solo acepta correos corporativos de Bacher Zoppi o UP Pharma.' });
        return;
      }
      const participants = asArray(base.participants);
      const registered = asArray(base.registeredUsers);
      const existingParticipant = participants.find(p => normalizeEmailValue(p.email) === normalizedEmail);
      const existingRegistered = registered.find(p => normalizeEmailValue(p.email) === normalizedEmail);
      const approvedSub = asArray(base.phaseSubmissions).find(s => normalizeEmailValue(s.email) === normalizedEmail && s.status === 'approved');
      const existing = existingParticipant || existingRegistered || approvedSub;
      if (existing) {
        const archive = base.capitalHumanoArchive;
        const capitalHumano = findCapitalHumanoHistory({ email: normalizedEmail, name: existing.name || existing.participantName, archive });
        sendJson(response, 200, {
          exists: true,
          userType: existingParticipant ? 'existing' : 'new',
          profile: {
            name: existing.name || existing.participantName || normalizedEmail,
            email: normalizedEmail,
            team: existing.team || inferTeamFromEmail(normalizedEmail),
            photo: existing.photo || '',
            avatar: existing.avatar || initials(existing.name || existing.participantName || normalizedEmail),
            capitalHumano
          }
        });
        return;
      }
      sendJson(response, 200, {
        exists: false,
        allowedToRegister: settings.allowNewUsers !== false,
        inferredTeam: inferTeamFromEmail(normalizedEmail)
      });
      return;
    }
    if (path.startsWith('/api/prediction-windows/') && request.method === 'PUT') {
      const id = path.replace('/api/prediction-windows/', '');
      const parsed = await readJsonBody(request);
      const base = readState();
      const wins = asArray(base.predictionWindows);
      const idx = wins.findIndex(w => w.id === id);
      if (idx === -1) { sendJson(response, 404, { error: 'Window not found' }); return; }
      const updated = { ...wins[idx], ...parsed, id, updatedAt: new Date().toISOString() };
      wins[idx] = updated;
      writeState({ ...base, predictionWindows: wins });
      sendJson(response, 200, { window: updated });
      return;
    }
    if (path.startsWith('/api/prediction-windows/') && request.method === 'DELETE') {
      const id = path.replace('/api/prediction-windows/', '');
      const base = readState();
      const wins = asArray(base.predictionWindows).filter(w => w.id !== id);
      writeState({ ...base, predictionWindows: wins });
      sendJson(response, 200, { ok: true });
      return;
    }

    // Phase submissions (quinielas de segunda fase)
    if (path === '/api/phase-submissions') {
      if (request.method === 'GET') {
        const { searchParams } = new URL(request.url, 'http://localhost');
        const windowId = searchParams.get('windowId');
        let subs = asArray(readState().phaseSubmissions);
        if (windowId) subs = subs.filter(s => s.windowId === windowId);
        sendJson(response, 200, { submissions: subs });
        return;
      }
      if (request.method === 'POST') {
        const parsed = await readJsonBody(request);
        if (!parsed.email || !parsed.windowId || !parsed.predictions) {
          sendJson(response, 400, { error: 'email, windowId y predictions son requeridos' }); return;
        }
        const base = readState();
        const settings = base.continuationSettings;
        const email = normalizeEmailValue(parsed.email);
        if (!isEmailAllowed(email, settings)) {
          sendJson(response, 403, { error: 'domain_not_allowed', message: 'Correo corporativo no permitido.' });
          return;
        }
        const wins = asArray(base.predictionWindows);
        const win = wins.find(w => w.id === parsed.windowId);
        if (!win || !['open', 'scheduled', 'draft'].includes(String(win.status || 'draft'))) {
          sendJson(response, 400, { error: 'window_closed', message: 'La ventana no está abierta.' });
          return;
        }
        const matchMeta = asObject(parsed.matchMeta);
        const subs = asArray(base.phaseSubmissions);
        const existing = subs.findIndex(s => normalizeEmailValue(s.email) === email && s.windowId === parsed.windowId);
        const previous = existing >= 0 ? subs[existing] : null;
        const nextPredictions = {};
        const audit = asArray(previous?.audit);
        for (const [matchId, pred] of Object.entries(asObject(parsed.predictions))) {
          const meta = matchMeta[String(matchId)] || matchMeta[matchId];
          if (!meta || !isConfirmedMatch(meta)) {
            sendJson(response, 400, { error: 'match_unconfirmed', matchId, message: 'Este cruce se activará cuando se confirmen los equipos.' });
            return;
          }
          if (isSubmissionMatchLocked(meta, settings)) {
            if (previous?.predictions?.[matchId]) {
              nextPredictions[matchId] = previous.predictions[matchId];
              continue;
            }
            sendJson(response, 400, { error: 'match_locked', matchId, message: 'Este partido ya cerró para pronósticos.' });
            return;
          }
          nextPredictions[matchId] = {
            homeScore: Number(pred.homeScore),
            awayScore: Number(pred.awayScore),
            savedAt: new Date().toISOString(),
            lockedAt: getMatchLockAtValue(meta, settings.lockMinutesBeforeKickoff)
          };
        }
        const existingParticipant = asArray(base.participants).find(p => normalizeEmailValue(p.email) === email);
        const entry = {
          id: existing >= 0 ? subs[existing].id : makeId('sub'),
          windowId: parsed.windowId,
          email,
          participantName: String(parsed.participantName || existingParticipant?.name || email).trim(),
          team: parsed.team || existingParticipant?.team || inferTeamFromEmail(email),
          userType: existingParticipant ? 'existing' : (parsed.userType || 'new'),
          status: existing >= 0 && previous.status === 'approved' ? 'edited' : 'pending',
          predictions: nextPredictions,
          approvedPredictions: existing >= 0
            ? (previous.status === 'approved' ? previous.predictions : previous.approvedPredictions || {})
            : {},
          createdAt: existing >= 0 ? subs[existing].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reviewedAt: existing >= 0 ? previous.reviewedAt || '' : '',
          reviewedBy: existing >= 0 ? previous.reviewedBy || '' : '',
          rejectedReason: '',
          audit: [...audit, { type: existing >= 0 ? 'public_update' : 'public_create', at: new Date().toISOString() }]
        };
        if (existing >= 0) subs[existing] = entry; else subs.push(entry);
        const savedState = writeState({ ...base, phaseSubmissions: subs });
        sendJson(response, 200, { submission: entry, status: entry.status, message: 'Tus pronósticos fueron recibidos y quedarán pendientes de revisión.', updated: existing >= 0 });
        try { notifyAdminNewSubmission(entry, savedState); } catch { /* notification is best-effort */ }
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' }); return;
    }
    if (path.startsWith('/api/phase-submissions/') && path.endsWith('/approve') && request.method === 'POST') {
      const id = path.replace('/api/phase-submissions/', '').replace('/approve', '');
      const base = readState();
      const subs = asArray(base.phaseSubmissions);
      const idx = subs.findIndex(s => s.id === id);
      if (idx === -1) { sendJson(response, 404, { error: 'Submission not found' }); return; }
      const sub = subs[idx];
      const participants = asArray(base.participants);
      const pidx = participants.findIndex(p => normalizeEmailValue(p.email) === normalizeEmailValue(sub.email) || p.name === sub.participantName);
      const approvedPredictions = Object.fromEntries(Object.entries(asObject(sub.predictions)).map(([matchId, p]) => [matchId, { homeScore: Number(p.homeScore), awayScore: Number(p.awayScore) }]));
      // Actualizar datos básicos del participante SIN mezclar sus predictions de RH
      if (pidx >= 0) {
        participants[pidx] = {
          ...participants[pidx],
          email: normalizeEmailValue(sub.email),
          team: sub.team || participants[pidx].team,
          continuationPredictions: { ...asObject(participants[pidx].continuationPredictions), ...approvedPredictions }
        };
      } else {
        participants.push({
          id: makeId('participant'),
          name: sub.participantName || sub.email,
          email: normalizeEmailValue(sub.email),
          team: sub.team || inferTeamFromEmail(sub.email),
          avatar: initials(sub.participantName || sub.email),
          photo: '',
          predictions: {},
          continuationPredictions: approvedPredictions,
          createdFrom: 'continuation_submission'
        });
      }
      subs[idx] = { ...sub, status: 'approved', approvedPredictions: approvedPredictions, reviewedAt: new Date().toISOString(), reviewedBy: 'admin', audit: [...asArray(sub.audit), { type: 'approved', by: 'admin', at: new Date().toISOString() }] };
      const registeredUsers = asArray(base.registeredUsers);
      if (!registeredUsers.some(u => normalizeEmailValue(u.email) === normalizeEmailValue(sub.email))) {
        registeredUsers.push({ name: sub.participantName, email: normalizeEmailValue(sub.email), team: sub.team, userType: sub.userType, createdAt: new Date().toISOString() });
      }
      // Actualizar phaseProgress si existe
      const phaseProgress = asArray(base.phaseProgress);
      const ppIdx = phaseProgress.findIndex(pp => normalizeEmailValue(pp.email) === normalizeEmailValue(sub.email));
      if (ppIdx >= 0) phaseProgress[ppIdx] = { ...phaseProgress[ppIdx], status: 'approved', approvedAt: new Date().toISOString() };
      const saved = writeState({ ...base, participants, phaseSubmissions: subs, registeredUsers, phaseProgress });
      sendJson(response, 200, { submission: subs[idx], participants: saved.participants });
      return;
    }
    if (path.startsWith('/api/phase-submissions/') && path.endsWith('/reject') && request.method === 'POST') {
      const id = path.replace('/api/phase-submissions/', '').replace('/reject', '');
      const parsed = await readJsonBody(request);
      const base = readState();
      const subs = asArray(base.phaseSubmissions);
      const idx = subs.findIndex(s => s.id === id);
      if (idx === -1) { sendJson(response, 404, { error: 'Submission not found' }); return; }
      subs[idx] = { ...subs[idx], status: 'rejected', rejectedReason: parsed.reason || '', reviewedAt: new Date().toISOString(), reviewedBy: 'admin', audit: [...asArray(subs[idx].audit), { type: 'rejected', by: 'admin', at: new Date().toISOString(), reason: parsed.reason || '' }] };
      const phaseProgressR = asArray(base.phaseProgress);
      const ppIdxR = phaseProgressR.findIndex(pp => normalizeEmailValue(pp.email) === normalizeEmailValue(subs[idx].email));
      if (ppIdxR >= 0) phaseProgressR[ppIdxR] = { ...phaseProgressR[ppIdxR], status: 'rejected', rejectedAt: new Date().toISOString() };
      writeState({ ...base, phaseSubmissions: subs, phaseProgress: phaseProgressR });
      sendJson(response, 200, { submission: subs[idx] });
      return;
    }
    if (path === '/api/phase-progress') {
      if (request.method === 'GET') {
        const state = readState();
        sendJson(response, 200, { phaseProgress: asArray(state.phaseProgress) });
        return;
      }
      if (request.method === 'POST') {
        const parsed = await readJsonBody(request);
        const base = readState();
        const phaseProgress = asArray(base.phaseProgress);
        const email = normalizeEmailValue(parsed.email || '');
        if (!email) { sendJson(response, 400, { error: 'email required' }); return; }
        const existing = phaseProgress.findIndex(pp => normalizeEmailValue(pp.email) === email);
        const now = new Date().toISOString();
        if (existing >= 0) {
          const prev = phaseProgress[existing];
          phaseProgress[existing] = {
            ...prev,
            status: parsed.status || prev.status,
            predictionCount: parsed.predictionCount ?? prev.predictionCount,
            lastSeenAt: now,
            ...(parsed.status === 'submitted' ? { submittedAt: now } : {}),
            ...(parsed.participantName && !prev.participantName ? { participantName: parsed.participantName } : {}),
            ...(parsed.team && !prev.team ? { team: parsed.team } : {})
          };
        } else {
          phaseProgress.push({
            id: `prog_${Date.now().toString(36)}`,
            windowId: parsed.windowId || '',
            email,
            participantName: parsed.participantName || '',
            team: parsed.team || '',
            userType: parsed.userType || 'existing',
            status: parsed.status || 'started',
            predictionCount: parsed.predictionCount || 0,
            firstSeenAt: now,
            lastSeenAt: now,
            submittedAt: parsed.status === 'submitted' ? now : '',
            approvedAt: '',
            rejectedAt: ''
          });
        }
        writeState({ ...base, phaseProgress });
        sendJson(response, 200, { ok: true });
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' }); return;
    }
    if (path === '/api/capital-humano/archive') {
      if (request.method === 'GET') {
        sendJson(response, 200, { archive: readState().capitalHumanoArchive });
        return;
      }
      sendJson(response, 405, { error: 'Method not allowed' }); return;
    }
    if (path === '/api/capital-humano/archive/freeze' && request.method === 'POST') {
      const parsed = await readJsonBody(request);
      const base = readState();
      const nowIso = new Date().toISOString();
      const archive = {
        id: 'capital_humano_grupos_2026',
        title: 'Quiniela Capital Humano · Fase de grupos',
        organizer: 'Capital Humano',
        status: 'closed',
        closedAt: parsed.closedAt || nowIso,
        frozenAt: nowIso,
        source: 'group_stage',
        matches: asArray(parsed.matches),
        participants: asArray(parsed.participants),
        standings: asArray(parsed.standings),
        podium: asArray(parsed.standings).slice(0, 3),
        generatedBy: parsed.generatedBy || 'admin',
        generatedAt: nowIso
      };
      const settings = {
        ...base.continuationSettings,
        transitionNoticeEnabled: true,
        transitionPopup: {
          ...base.continuationSettings.transitionPopup,
          enabled: true
        }
      };
      writeState({ ...base, capitalHumanoArchive: archive, continuationSettings: settings });
      sendJson(response, 200, { archive });
      return;
    }
    if (path.startsWith('/api/phase-submissions/') && request.method === 'DELETE') {
      const id = path.replace('/api/phase-submissions/', '');
      const base = readState();
      const subs = asArray(base.phaseSubmissions).filter(s => s.id !== id);
      writeState({ ...base, phaseSubmissions: subs });
      sendJson(response, 200, { ok: true });
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
