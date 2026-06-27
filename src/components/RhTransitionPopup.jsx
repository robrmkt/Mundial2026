import { useEffect, useMemo, useState } from 'react';
import { readRhPopupState, writeRhPopupState } from '../services/transitionNotice';

const POPUP_MIN_VERSION = 2;
const DEFAULT_MAX_VIEWS = 4;
const DEFAULT_COOLDOWN_HOURS = 2;

const DEFAULT_COPY = {
  before_close: {
    title: 'La Quiniela RH está por finalizar',
    body: 'La fase de grupos está por cerrar y la Quiniela RH quedará guardada como histórico. ¿Quieres seguir jugando? Entra a la Nueva Quiniela y registra tus pronósticos para la siguiente fase. Si ya participaste, usa tu mismo correo. Si eres nuevo, también puedes registrarte. Pasa la voz.',
    primaryCta: 'Continuar a Nueva Quiniela',
    secondaryCta: 'Cerrar'
  },
  after_close: {
    title: 'La Quiniela RH ya finalizó',
    body: 'La Quiniela RH cerró con la fase de grupos y sus resultados quedaron guardados como histórico. La siguiente fase ya está disponible. Puedes entrar a la Nueva Quiniela, registrar tus pronósticos y seguir participando. Pasa la voz.',
    primaryCta: 'Nueva Quiniela',
    secondaryCta: 'Ver Quiniela RH',
    tertiaryCta: 'Cerrar'
  }
};

function getPopupConfig(settings) {
  const safeSettings = settings && typeof settings === 'object' ? settings : {};
  const transitionPopup = safeSettings.transitionPopup && typeof safeSettings.transitionPopup === 'object'
    ? safeSettings.transitionPopup
    : {};
  const legacyEnabled = safeSettings.transitionNoticeEnabled !== false;
  const rawConfig = {
    enabled: legacyEnabled,
    version: safeSettings.transitionNoticeVersion || POPUP_MIN_VERSION,
    maxViews: DEFAULT_MAX_VIEWS,
    cooldownHours: DEFAULT_COOLDOWN_HOURS,
    startsAt: '2026-06-26T00:00:00-06:00',
    afterCloseAt: '2026-06-28T00:00:00-06:00',
    endsAt: '2026-07-02T23:59:00-06:00',
    beforeClose: DEFAULT_COPY.before_close,
    afterClose: DEFAULT_COPY.after_close,
    ...transitionPopup
  };

  return {
    ...rawConfig,
    version: Math.max(Number(rawConfig.version) || POPUP_MIN_VERSION, POPUP_MIN_VERSION),
    maxViews: Math.max(Number(rawConfig.maxViews) || DEFAULT_MAX_VIEWS, DEFAULT_MAX_VIEWS),
    cooldownHours: Number.isFinite(Number(rawConfig.cooldownHours)) ? Number(rawConfig.cooldownHours) : DEFAULT_COOLDOWN_HOURS,
    beforeClose: { ...(rawConfig.beforeClose || {}), ...DEFAULT_COPY.before_close },
    afterClose: { ...(rawConfig.afterClose || {}), ...DEFAULT_COPY.after_close }
  };
}

function canShowAgain(state, now, cooldownHours) {
  const cooldownMs = Math.max(0, Number(cooldownHours) || 0) * 60 * 60 * 1000;
  if (!cooldownMs) return true;

  const lastSeenAt = Date.parse(state.dismissedAt || state.lastSeenAt || '');
  if (!Number.isFinite(lastSeenAt)) return true;

  return now - lastSeenAt >= cooldownMs;
}

export default function RhTransitionPopup({ settings, activeTab, goToTab, isAdmin, hasArchive }) {
  const [popupState, setPopupState] = useState({ visible: false, phase: 'before_close', key: '' });
  const popup = useMemo(() => getPopupConfig(settings), [settings]);
  const version = popup.version || POPUP_MIN_VERSION;
  const maxViews = popup.maxViews ?? DEFAULT_MAX_VIEWS;
  const cooldownHours = popup.cooldownHours ?? DEFAULT_COOLDOWN_HOURS;

  useEffect(() => {
    let nextState = { visible: false, phase: 'before_close', key: '' };
    const now = Date.now();
    const afterCloseAt = popup.afterCloseAt || settings?.startAt;
    const afterCloseTime = afterCloseAt ? Date.parse(afterCloseAt) : Infinity;
    const phase = hasArchive || now >= afterCloseTime ? 'after_close' : 'before_close';
    const key = `rh_to_new_quiniela_popup_v${version}_${phase}`;

    if (!isAdmin && popup.enabled !== false && activeTab !== 'nuevaQuiniela' && activeTab !== 'capitalHumano') {
      const startsAt = popup.startsAt ? Date.parse(popup.startsAt) : 0;
      const endsAt = popup.endsAt ? Date.parse(popup.endsAt) : Infinity;
      const inRange = (!Number.isFinite(startsAt) || now >= startsAt) && (!Number.isFinite(endsAt) || now <= endsAt);
      const state = inRange ? readRhPopupState(key) : {};
      const hasViewsLeft = (state.views || 0) < maxViews;
      const cooldownElapsed = canShowAgain(state, now, cooldownHours);

      nextState = {
        visible: inRange && hasViewsLeft && cooldownElapsed,
        phase,
        key
      };
    }

    const timer = setTimeout(() => setPopupState(nextState), 0);
    return () => clearTimeout(timer);
  }, [activeTab, cooldownHours, hasArchive, isAdmin, maxViews, popup.afterCloseAt, popup.enabled, popup.endsAt, popup.startsAt, settings?.startAt, version]);

  const close = (action = 'close') => {
    const state = readRhPopupState(popupState.key);
    writeRhPopupState(popupState.key, {
      ...state,
      views: (state.views || 0) + 1,
      dismissedAt: new Date().toISOString(),
      action
    });
    setPopupState(prev => ({ ...prev, visible: false }));
  };

  const goNew = () => {
    close('new_quiniela');
    goToTab?.('nuevaQuiniela');
    if (typeof window !== 'undefined') window.location.hash = '#nueva-quiniela';
  };

  const goRh = () => {
    close('quiniela_rh');
    goToTab?.('capitalHumano');
    if (typeof window !== 'undefined') window.location.hash = '#capital-humano';
  };

  if (!popupState.visible) return null;

  const copy = popupState.phase === 'after_close'
    ? { ...(popup.afterClose || {}), ...DEFAULT_COPY.after_close }
    : { ...(popup.beforeClose || {}), ...DEFAULT_COPY.before_close };

  return (
    <div className="transition-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="rh-popup-title">
      <div className="transition-popup-card">
        <span className="transition-popup-badge">{popupState.phase === 'after_close' ? 'Histórico RH' : 'Nueva etapa'}</span>
        <h2 id="rh-popup-title">{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="transition-popup-actions">
          <button className="transition-popup-primary" onClick={goNew}>{copy.primaryCta || 'Nueva Quiniela'}</button>
          {popupState.phase === 'after_close' && (
            <button className="transition-popup-secondary" onClick={goRh}>{copy.secondaryCta || 'Ver Quiniela RH'}</button>
          )}
          <button className="transition-popup-secondary muted" onClick={() => close('close')}>
            {popupState.phase === 'after_close' ? (copy.tertiaryCta || 'Cerrar') : (copy.secondaryCta || 'Cerrar')}
          </button>
        </div>
      </div>
    </div>
  );
}
