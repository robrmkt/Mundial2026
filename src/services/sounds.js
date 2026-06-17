// Sonidos cortos por porra, SINTETIZADOS con WebAudio (sin archivos, sin CDN).
// Si el audio está bloqueado (sin interacción), todo falla en silencio: la app
// y las animaciones siguen funcionando igual.
//
// Si en el futuro quieres usar mp3 reales, basta con cambiar las funciones de
// abajo por reproducción de /sounds/<nombre>.mp3; la API pública no cambia.

const SOUND_BY_REACTION = {
  confetti: 'confetti',
  balls: 'whistle',
  fire: 'fire',
  mexico: 'crowd',
  canada: 'crowd',
  usa: 'crowd',
  luck: 'magic',
  buzz: 'drum',
  clap: 'clap',
  faith: 'bells'
};

let ctx = null;
let master = null;
let unlocked = false;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) {
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.5; // volumen general moderado
    master.connect(ctx.destination);
  }
  return ctx;
}

// Desbloquea el audio tras una interacción directa (iPhone/Safari/Chrome).
export function unlockSounds() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (unlocked) return;
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.00001;
    o.connect(g).connect(master);
    o.start();
    o.stop(c.currentTime + 0.02);
    unlocked = true;
  } catch {
    /* sin audio: silencio */
  }
}

function noiseSource(c, dur) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function whistle(c) {
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 2100;
  const lfo = c.createOscillator();
  lfo.frequency.value = 26;
  const lg = c.createGain();
  lg.gain.value = 55;
  lfo.connect(lg).connect(o.frequency);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2100;
  bp.Q.value = 6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
  g.gain.setValueAtTime(0.3, t + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  o.connect(bp).connect(g).connect(master);
  lfo.start(t); lfo.stop(t + 0.36);
  o.start(t); o.stop(t + 0.37);
}

function drum(c) {
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.18);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.4);
}

function clap(c) {
  const t0 = c.currentTime;
  [0, 0.085, 0.17].forEach((d, i) => {
    const src = noiseSource(c, 0.08);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.2;
    const g = c.createGain();
    const t = t0 + d;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45 - i * 0.08, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(bp).connect(g).connect(master);
    src.start(t); src.stop(t + 0.08);
  });
}

function crowd(c) {
  const t = c.currentTime;
  const src = noiseSource(c, 1.0);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.linearRampToValueAtTime(1300, t + 0.5);
  lp.frequency.linearRampToValueAtTime(500, t + 1.0);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.35, t + 0.35);
  g.gain.linearRampToValueAtTime(0.0001, t + 0.98);
  src.connect(lp).connect(g).connect(master);
  src.start(t); src.stop(t + 1.0);
}

function fire(c) {
  const t = c.currentTime;
  const src = noiseSource(c, 0.6);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1000; bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < 14; i++) {
    const tt = t + Math.random() * 0.55;
    g.gain.setValueAtTime(0.06 + Math.random() * 0.25, tt);
    g.gain.exponentialRampToValueAtTime(0.02, tt + 0.03);
  }
  g.gain.setValueAtTime(0.0001, t + 0.6);
  src.connect(bp).connect(g).connect(master);
  src.start(t); src.stop(t + 0.6);
}

function confettiSound(c) {
  const t0 = c.currentTime;
  [880, 1320, 1760, 2200].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'triangle'; o.frequency.value = f;
    const g = c.createGain();
    const t = t0 + i * 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.13);
  });
}

function magic(c) {
  const t0 = c.currentTime;
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const g = c.createGain();
    const t = t0 + i * 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.24, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.2);
  });
}

function bells(c) {
  const t0 = c.currentTime;
  [0, 0.42].forEach((d) => {
    const t = t0 + d;
    const fund = 587;
    [[1, 0.3], [2.0, 0.18], [2.76, 0.12], [5.4, 0.06]].forEach(([mult, amp]) => {
      const o = c.createOscillator();
      o.type = 'sine'; o.frequency.value = fund * mult;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.95);
    });
  });
}

const PLAYERS = {
  whistle, drum, clap, crowd, fire, magic, bells,
  confetti: confettiSound
};

// Reproduce el sonido de una porra. Silencioso y a prueba de fallos.
export function playReactionSound(type) {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const sound = SOUND_BY_REACTION[type];
    const fn = sound && PLAYERS[sound];
    if (fn) fn(c);
  } catch {
    /* audio bloqueado o no soportado: la animación visual sigue igual */
  }
}
