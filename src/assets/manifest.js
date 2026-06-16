// Manifiesto visual (V4). Centraliza las rutas de assets LOCALES (sin URLs
// externas en producción). Hoy no hay archivos de stickers/Lottie, así que el
// sistema usa emojis como respaldo (ver EventIcon). Cuando se agreguen los
// archivos a /public/assets, basta poner ASSETS_AVAILABLE = true.
export const ASSETS_AVAILABLE = false;

export const VISUAL_MANIFEST = {
  stickers: {
    ball: '/assets/stickers/ball.svg',
    trophy: '/assets/stickers/trophy.svg',
    clover: '/assets/stickers/clover.svg',
    fire: '/assets/stickers/fire.svg',
    applause: '/assets/stickers/applause.svg',
    yellowCard: '/assets/stickers/yellow-card.svg',
    redCard: '/assets/stickers/red-card.svg'
  },
  animations: {
    goal: '/assets/lottie/goal.lottie',
    mexicoGoal: '/assets/lottie/mexico-goal.lottie',
    yellowCard: '/assets/lottie/yellow-card.lottie',
    redCard: '/assets/lottie/red-card.lottie',
    penalty: '/assets/lottie/penalty.lottie',
    penaltyMissed: '/assets/lottie/penalty-missed.lottie',
    leaderPack: '/assets/lottie/leader-pack.lottie',
    podium: '/assets/lottie/podium.lottie',
    exactScore: '/assets/lottie/exact-score.lottie'
  }
};

// Emoji de respaldo por tipo semántico (la lógica usa la clave, no el emoji).
export const TYPE_EMOJI = {
  goal: '⚽',
  mexico_goal: '🇲🇽',
  yellow_card: '🟨',
  red_card: '🟥',
  penalty: '🎯',
  penalty_missed: '❌',
  var: '📺',
  substitution: '🔁',
  halftime: '⏸',
  fulltime: '🏁',
  kickoff: '🟢',
  leader_change: '👑',
  podium_change: '🥉',
  exact_score: '🎯',
  luck: '🍀',
  boo: '👻',
  reaction: '🎉',
  generic: '•'
};
