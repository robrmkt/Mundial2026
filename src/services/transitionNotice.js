const NOTICE_KEY_PREFIX = 'capital_humano_notice_v';

export function shouldShowTransitionNotice(settings, archive) {
  if (!settings?.transitionNoticeEnabled) return false;
  if (!archive) return false;
  const version = settings.transitionNoticeVersion || 1;
  try {
    return window.localStorage.getItem(`${NOTICE_KEY_PREFIX}${version}_dismissed`) !== '1';
  } catch {
    return true;
  }
}

export function dismissTransitionNotice(version = 1) {
  try {
    window.localStorage.setItem(`${NOTICE_KEY_PREFIX}${version}_dismissed`, '1');
  } catch {
    /* no-op */
  }
}
