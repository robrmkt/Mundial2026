export function readRhPopupState(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !key) return {};
    return JSON.parse(window.localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

export function writeRhPopupState(key, next) {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !key) return;
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* no-op */
  }
}
