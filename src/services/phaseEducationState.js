// Persistencia de avisos "anti-confusión" RH vs Nueva Quiniela.
// Guarda en localStorage qué avisos ya cerró el usuario, sin reventar en SSR.
export function readPhaseEducationState(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !key) return {};
    return JSON.parse(window.localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

export function writePhaseEducationState(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !key) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no-op */
  }
}

// Versión del set de avisos. Subir este número hace que los cintillos cerrados
// vuelvan a aparecer (por ejemplo tras un cambio de copy importante).
export const PHASE_EDUCATION_VERSION = 4;
