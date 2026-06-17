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
  faith: { colors: ['#0E7C4A', '#ffffff', '#D7282F'], emojis: ['🙏', '🇲🇽', '📿', '🕯️', '✨'] }
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
