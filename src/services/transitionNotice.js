export function readRhPopupState(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

export function writeRhPopupState(key, next) {
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* no-op */
  }
}
