// Celebraciones visuales: confeti (canvas-confetti vía npm, sin CDN externo)
// y balones de fútbol que cruzan la pantalla.
import confetti from 'canvas-confetti';

const WC_COLORS = ['#0E7C4A', '#D7282F', '#1D4ED8', '#F4B400', '#ffffff'];

function fireConfetti(options) {
  confetti({ colors: WC_COLORS, disableForReducedMotion: true, ...options });
}

function spawnBalls(count = 6) {
  for (let i = 0; i < count; i++) {
    const ball = document.createElement('span');
    ball.className = 'goal-ball';
    ball.textContent = '⚽';
    ball.style.left = `${Math.random() * 90}vw`;
    ball.style.animationDelay = `${Math.random() * 0.6}s`;
    ball.style.fontSize = `${22 + Math.random() * 26}px`;
    document.body.appendChild(ball);
    setTimeout(() => ball.remove(), 3200);
  }
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

// Porras que lanzan los usuarios desde el muro. Cada tipo tiene su look.
export function celebrateReaction(type) {
  switch (type) {
    case 'mexico':
      celebrateMexicoGoal();
      break;
    case 'balls':
      spawnBalls(9);
      fireConfetti({ particleCount: 40, spread: 70, origin: { y: 0.8 } });
      break;
    case 'fire':
      fireConfetti({ particleCount: 90, spread: 60, origin: { y: 0.8 }, colors: ['#D7282F', '#F4B400', '#ff7a18'] });
      break;
    case 'clap':
      fireConfetti({ particleCount: 70, spread: 100, origin: { y: 0.85 }, colors: ['#F4B400', '#ffffff', '#0E7C4A'] });
      break;
    case 'confetti':
    default:
      celebrateGoal();
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
