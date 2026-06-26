import { useEffect, useMemo, useState } from 'react';
import { readRhPopupState, writeRhPopupState } from '../services/transitionNotice';

const DEFAULT_COPY = {
  before_close: {
    title: 'La Quiniela RH está por finalizar',
    body: 'La dinámica de RH cierra con la fase de grupos. Si quieres seguir con la fiebre mundialista, te invitamos a ingresar tus pronósticos para la siguiente fase en la Nueva Quiniela. Es una dinámica interna para seguir disfrutando el Mundial entre todos.',
    primaryCta: 'Ir a Nueva Quiniela',
    secondaryCta: 'Cerrar'
  },
  after_close: {
    title: 'La Quiniela RH ya finalizó',
    body: 'La dinámica de RH cerró con la fase de grupos y sus resultados quedaron guardados como histórico. Si quieres seguir con la fiebre mundialista, ya puedes participar en la Nueva Quiniela.',
    primaryCta: 'Ir a Nueva Quiniela',
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
  return {
    enabled: legacyEnabled,
    version: safeSettings.transitionNoticeVersion || 1,
    maxViews: 2,
    startsAt: '2026-06-26T00:00:00-06:00',
    afterCloseAt: '2026-06-28T00:00:00-06:00',
    endsAt: '2026-07-02T23:59:00-06:00',
    beforeClose: DEFAULT_COPY.before_close,
    afterClose: DEFAULT_COPY.after_close,
    ...transitionPopup
  };
}

export default function RhTransitionPopup({ settings, activeTab, goToTab, isAdmin, hasArchive }) {
  const [popupState, setPopupState] = useState({ visible: false, phase: 'before_close', key: '' });
  const popup = useMemo(() => getPopupConfig(settings), [settings]);
  const version = popup.version || 1;
  const maxViews = popup.maxViews ?? 2;

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

      nextState = {
        visible: inRange && (state.views || 0) < maxViews,
        phase,
        key
      };
    }

    const timer = setTimeout(() => setPopupState(nextState), 0);
    return () => clearTimeout(timer);
  }, [activeTab, hasArchive, isAdmin, maxViews, popup.afterCloseAt, popup.enabled, popup.endsAt, popup.startsAt, settings?.startAt, version]);

  const close = (action = 'close') => {
    const state = readRhPopupState(popupState.key);
    writeRhPopupState(popupState.key, {
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
    ? { ...DEFAULT_COPY.after_close, ...(popup.afterClose || {}) }
    : { ...DEFAULT_COPY.before_close, ...(popup.beforeClose || {}) };

  return (
    <div className="transition-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="rh-popup-title">
      <div className="transition-popup-card">
        <span className="transition-popup-badge">{popupState.phase === 'after_close' ? 'Histórico RH' : 'Nueva etapa'}</span>
        <h2 id="rh-popup-title">{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="transition-popup-actions">
          <button className="transition-popup-primary" onClick={goNew}>{copy.primaryCta || 'Ir a Nueva Quiniela'}</button>
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
