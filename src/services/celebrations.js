// Celebraciones visuales: confeti (canvas-confetti vía npm, sin CDN externo)
// y balones de fútbol que cruzan la pantalla.
import confetti from 'canvas-confetti';
import { playReactionSound } from './sounds';

const WC_COLORS = ['#0E7C4A', '#D7282F', '#1D4ED8', '#F4B400', '#ffffff'];

function fireConfetti(options) {
  confetti({ colors: WC_COLORS, disableForReducedMotion: true, ...options });
}

// Lluvia de emojis que cruzan la pantalla (reusa la animación de los balones).
function spawnEmojiRain(emojis, count = 10) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'goal-ball';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = `${Math.random() * 92}vw`;
    el.style.animationDelay = `${Math.random() * 0.7}s`;
    el.style.fontSize = `${20 + Math.random() * 24}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}

function spawnBalls(count = 6) {
  spawnEmojiRain(['⚽'], count);
}

// Cada porra tiene su propio tema (colores de confeti + lluvia de íconos),
// para que ninguna se quede solo con confeti.
const THEMES = {
  mexico: { colors: ['#0E7C4A', '#ffffff', '#D7282F'], emojis: ['🇲🇽', '🌮', '🌶️', '🪅', '🤠', '🌵', '🎉'] },
  canada: { colors: ['#FF0000', '#ffffff'], emojis: ['🇨🇦', '🍁', '🏒', '🐻', '🦫'] },
  usa: { colors: ['#3C3B6E', '#B22234', '#ffffff'], emojis: ['🇺🇸', '🦅', '⭐', '🗽', '🍔'] },
  fire: { colors: ['#D7282F', '#F4B400', '#ff7a18'], emojis: ['🔥', '🔥', '🔥', '🌋'] },
  clap: { colors: ['#F4B400', '#ffffff', '#0E7C4A'], emojis: ['👏', '🙌', '🎉', '⭐'] },
  confetti: { colors: ['#0E7C4A', '#D7282F', '#1D4ED8', '#F4B400', '#ffffff'], emojis: ['🎉', '🎊', '✨'] },
  balls: { colors: ['#ffffff', '#0E7C4A', '#1D4ED8'], emojis: ['⚽', '🥅', '🏟️'] },
  buzz: { colors: ['#111827', '#F4B400', '#ffffff'], emojis: ['🥁', '💥', '📣'] },
  luck: { colors: ['#0E7C4A', '#7CFC00', '#ffffff'], emojis: ['🍀', '✨', '🤞'] },
  faith: { colors: ['#0E7C4A', '#ffffff', '#D7282F'], emojis: ['🙏', '🇲🇽', '📿', '🕯️', '✨'] },
  boo: { colors: ['#6b21a8', '#ffffff', '#c4b5fd'], emojis: ['👻', '😤', '💨', '🙃'] }
};

// Celebración genérica basada en el tema (confeti + lluvia de emojis).
function celebrateThemed(type, { count = 12, particleCount = 80, spread = 90 } = {}) {
  const th = THEMES[type] || THEMES.confetti;
  fireConfetti({ particleCount, spread, origin: { y: 0.82 }, colors: th.colors });
  spawnEmojiRain(th.emojis, count);
}

// "Tengo fe": lluvia de fe + México y confeti tricolor.
function celebrateFaith() {
  fireConfetti({ particleCount: 85, spread: 95, origin: { y: 0.82 }, colors: ['#0E7C4A', '#ffffff', '#D7282F'] });
  spawnEmojiRain(['🙏', '🇲🇽', '📿', '🕯️', '✨'], 14);
}

// Zumbido tipo MSN: sacude la página + golpe de tambor (WebAudio, sin archivo).
let audioCtx = null;
function playDrum() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.6, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch {
    // audio bloqueado (sin interacción previa): el temblor visual igual ocurre
  }
}

export function buzzPage() {
  const el = document.querySelector('.app-container') || document.body;
  el.classList.remove('page-shake');
  void el.offsetWidth; // reinicia la animación
  el.classList.add('page-shake');
  setTimeout(() => el.classList.remove('page-shake'), 650);
  playDrum();
}

export function celebrateGoal(colors) {
  fireConfetti({ particleCount: 110, spread: 80, origin: { y: 0.8 }, ...(colors ? { colors } : {}) });
  spawnBalls(7);
}

// Gol de México: mismo festejo pero en verde, blanco y rojo, con un eco extra
export function celebrateMexicoGoal() {
  const mx = ['#0E7C4A', '#ffffff', '#D7282F'];
  celebrateGoal(mx);
  setTimeout(() => fireConfetti({ particleCount: 70, spread: 100, origin: { y: 0.6 }, colors: mx }), 400);
}

// Hype/alerta previa de México: confeti tricolor + lluvia de fe (sin balones,
// para que NO se confunda con un gol real).
export function celebrateMexicoHype() {
  const mx = ['#0E7C4A', '#ffffff', '#D7282F'];
  const isCompact = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches;
  fireConfetti({ particleCount: isCompact ? 72 : 110, spread: 95, origin: { y: 0.84 }, colors: mx });
  fireConfetti({ particleCount: isCompact ? 36 : 58, angle: 60, spread: 66, origin: { x: 0, y: 0.72 }, colors: mx });
  fireConfetti({ particleCount: isCompact ? 36 : 58, angle: 120, spread: 66, origin: { x: 1, y: 0.72 }, colors: mx });
  spawnEmojiRain(['🙏', '✨', '🏟️', '🇲🇽'], isCompact ? 8 : 12);
}

// Final de partido: ráfaga discreta, sin balones
export function celebrateFinal() {
  fireConfetti({ particleCount: 40, spread: 55, origin: { y: 0.85 }, scalar: 0.8 });
}

// Alguien clavó el marcador exacto: festejo medio, dorado
export function celebrateExact() {
  fireConfetti({ particleCount: 75, spread: 70, origin: { y: 0.8 }, colors: ['#F4B400', '#0E7C4A', '#ffffff'] });
  spawnBalls(4);
}

export function celebratePodium() {
  fireConfetti({ particleCount: 140, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
  fireConfetti({ particleCount: 140, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
  setTimeout(() => fireConfetti({ particleCount: 180, spread: 110, origin: { y: 0.4 } }), 350);
  spawnBalls(10);
}

// Porras que lanzan los usuarios desde el muro. Cada tipo tiene su look + sonido.
export function celebrateReaction(type) {
  // Sonido por porra (silencioso si el audio está bloqueado; nunca rompe la app).
  // 'buzz' suena vía playDrum() dentro de buzzPage() para no duplicar el golpe.
  if (type !== 'buzz') {
    try { playReactionSound(type); } catch { /* sin audio */ }
  }

  switch (type) {
    case 'faith':
      celebrateFaith();
      break;
    case 'buzz':
      buzzPage(); // shake + "pum" sintético (playDrum)
      celebrateThemed('buzz', { count: 10, particleCount: 60, spread: 80 });
      break;
    case 'balls':
      celebrateThemed('balls', { count: 9 });
      break;
    case 'luck':
      celebrateLuck();
      break;
    case 'boo':
      celebrateBoo();
      break;
    case 'mexico':
    case 'canada':
    case 'usa':
    case 'fire':
    case 'clap':
    case 'confetti':
    default:
      celebrateThemed(THEMES[type] ? type : 'confetti');
      break;
  }
}

// Abucheo (porra 👻): el protagonista son los textos "buuu" flotando;
// los fantasmas quedan como acompañamiento, con un confeti morado muy leve.
const BOO_WORDS = ['¡buuu!', 'buuu', '¡buuuu!', 'BUUU'];
const BOO_GHOSTS = ['👻', '😤', '💨', '🙃'];

function spawnBooLayer(items, { className, count, min, max, life }) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = className;
    el.textContent = items[Math.floor(Math.random() * items.length)];
    el.style.left = `${8 + Math.random() * 80}vw`;
    el.style.fontSize = `${min + Math.random() * (max - min)}px`;
    el.style.setProperty('--boo-rot', `${Math.random() * 24 - 12}deg`);
    el.style.animationDelay = `${Math.random() * 0.45}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), life);
  }
}

export function celebrateBoo() {
  // Protagonista: las palabras "buuu".
  spawnBooLayer(BOO_WORDS, { className: 'boo-word', count: 8, min: 24, max: 44, life: 2200 });
  // Acompañamiento: fantasmas más chicos.
  spawnBooLayer(BOO_GHOSTS, { className: 'boo-ghost', count: 5, min: 18, max: 30, life: 2400 });
  // Confeti morado muy leve.
  fireConfetti({ particleCount: 28, spread: 75, startVelocity: 22, scalar: 0.8, origin: { y: 0.82 }, colors: ['#6b21a8', '#a78bfa', '#c4b5fd'] });
}

// Suerte a un participante: lluvia de tréboles + confeti verde.
export function celebrateLuck() {
  fireConfetti({ particleCount: 50, spread: 70, origin: { y: 0.7 }, colors: ['#0E7C4A', '#7CFC00', '#ffffff'] });
  for (let i = 0; i < 9; i++) {
    const el = document.createElement('span');
    el.className = 'goal-ball';
    el.textContent = '🍀';
    el.style.left = `${Math.random() * 90}vw`;
    el.style.animationDelay = `${Math.random() * 0.6}s`;
    el.style.fontSize = `${20 + Math.random() * 22}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}

const PODIUM_REACTION_THEMES = {
  bank: {
    colors: ['#D7282F', '#F4B400', '#ff7a18'],
    emojis: ['🔥', '🔥', '🚒', '✨'],
    phrases: ['¡Anda de racha! 🔥', '¡Traigan los bomberos! 🚒', 'Reporten este hack 👁️👄👁️']
  },
  suspect: {
    colors: ['#1D4ED8', '#111827', '#ffffff'],
    emojis: ['👀', '👁️', '🖥️', '⏳', '📘'],
    phrases: ['Mmmm... sospechoso 👀', '¿Viajó al futuro? ⏳', 'Revisión de VAR por favor 🖥️', 'Almanaque detected 📘']
  },
  salt: {
    colors: ['#9ca3af', '#f8fafc', '#111827'],
    emojis: ['🧂', '🧂', '💀', '🚂', '🕯️'],
    phrases: ['¡No le atines a nada hoy! 🧂', 'Activando la maldición... 💀', 'Cruzazuleada en 3, 2, 1... 🚂', '¡Que falle el próximo! 🤫', 'Te rezo para que la fallen 🕯️']
  }
};

function spawnPodiumPhrase(text, type, index) {
  const el = document.createElement('span');
  el.className = `podium-burst-phrase podium-burst-${type}`;
  el.textContent = text;
  el.style.left = `${8 + Math.random() * 76}vw`;
  el.style.top = `${14 + Math.random() * 64}vh`;
  el.style.setProperty('--burst-rot', `${Math.random() * 14 - 7}deg`);
  el.style.animationDelay = `${index * 0.055 + Math.random() * 0.08}s`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

function spawnPodiumEmoji(icon, type, index) {
  const el = document.createElement('span');
  el.className = `podium-burst-emoji podium-burst-${type}`;
  el.textContent = icon;
  el.style.left = `${Math.random() * 92}vw`;
  el.style.top = type === 'salt' ? `${-6 + Math.random() * 8}vh` : `${62 + Math.random() * 24}vh`;
  el.style.fontSize = `${22 + Math.random() * 30}px`;
  el.style.setProperty('--burst-drift', `${Math.round((Math.random() - 0.5) * 130)}px`);
  el.style.animationDelay = `${Math.random() * 0.4 + index * 0.012}s`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function spawnSaltShaker() {
  const el = document.createElement('span');
  el.className = 'podium-burst-shaker';
  el.textContent = '🧂';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

export function celebratePodiumReaction(type) {
  const theme = PODIUM_REACTION_THEMES[type] || PODIUM_REACTION_THEMES.bank;
  const isCompact = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches;
  try { playReactionSound(type === 'bank' ? 'fire' : type === 'salt' ? 'boo' : 'clap'); } catch { /* sin audio */ }
  fireConfetti({
    particleCount: isCompact ? 38 : 58,
    spread: type === 'salt' ? 65 : 88,
    startVelocity: type === 'salt' ? 18 : 28,
    scalar: type === 'salt' ? 0.75 : 0.9,
    origin: { y: type === 'salt' ? 0.16 : 0.82 },
    colors: theme.colors
  });
  if (type === 'salt') spawnSaltShaker();
  const phraseCount = isCompact ? 5 : 8;
  const emojiCount = isCompact ? 14 : 24;
  for (let i = 0; i < phraseCount; i++) {
    spawnPodiumPhrase(theme.phrases[i % theme.phrases.length], type, i);
  }
  for (let i = 0; i < emojiCount; i++) {
    spawnPodiumEmoji(theme.emojis[i % theme.emojis.length], type, i);
  }
}
