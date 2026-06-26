import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Save } from 'lucide-react';
import { fetchContinuationProfile, inferTeamFromEmail, teamLabel } from '../services/continuation';
import { fetchPredictionWindows, fetchPhaseSubmissions, getWindowStatus, savePhaseSubmission, recordPhaseProgress } from '../services/predictionWindows';
import { getMatchKickoff, isMatchConfirmed, isMatchLocked, LOCK_MINUTES_BEFORE_KICKOFF } from '../services/matchLock';
import { displayTeamName, isPlaceholderTeam } from '../services/teamDisplay';
import PhaseMatchPredictionCard from './PhaseMatchPredictionCard';

function initials(nameOrEmail) {
  return String(nameOrEmail || 'NQ').split('@')[0].replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'NQ';
}

function scoreValue(value) {
  if (value === '') return '';
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return '';
  return Math.max(0, Math.min(99, parsed));
}

function groupMatchesByDate(matches) {
  return matches.reduce((acc, match) => {
    const kickoff = getMatchKickoff(match);
    const key = kickoff
      ? new Date(kickoff).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'Por confirmar';
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});
}

function CapitalHumanoSummary({ history }) {
  if (!history || history.status === 'pending_freeze') {
    return (
      <div className="newq-stat-card is-muted">
        <small>Quiniela RH · Histórico</small>
        <strong>Pendiente de cierre</strong>
        <span>Se mostrará al congelar la fase de grupos.</span>
      </div>
    );
  }
  if (history.status === 'not_found') {
    return (
      <div className="newq-stat-card is-muted">
        <small>Quiniela RH · Histórico</small>
        <strong>Sin registro previo</strong>
        <span>Participa desde la nueva quiniela.</span>
      </div>
    );
  }
  return (
    <div className="newq-stat-card">
      <small>Histórico Capital Humano</small>
      <strong>{history.rank ? `#${history.rank}` : '—'} · {history.points} pts</strong>
      <span>{history.exactHits} exactos · {history.outcomeHits} resultados</span>
    </div>
  );
}

function NuevaQuinielaSummary({ submission }) {
  if (!submission) {
    return (
      <div className="newq-stat-card">
        <small>Nueva Quiniela</small>
        <strong>Sin pronósticos todavía</strong>
        <span>Agrega tus primeras apuestas.</span>
      </div>
    );
  }
  const count = Object.keys(submission.predictions || {}).length;
  const statusLabel = { pending: 'Pendiente de revisión', approved: 'Aprobada', rejected: 'Rechazada', edited: 'Actualizada' }[submission.status] || 'Pendiente';
  return (
    <div className="newq-stat-card">
      <small>Nueva Quiniela</small>
      <strong>{count} pronósticos</strong>
      <span>{statusLabel}</span>
    </div>
  );
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abiertos' },
  { key: 'pending', label: 'Por confirmar' },
  { key: 'locked', label: 'Cerrados' },
];

function MobileSaveBar({ dirty, saving, savedAt, canSave, onSave }) {
  return (
    <div className={`newq-mobile-save-bar${dirty || saving ? ' is-active' : ''}`}>
      <div className="newq-mobile-save-status">
        {saving && <span className="newq-saving">Guardando...</span>}
        {!saving && dirty && <span className="newq-unsaved">Cambios sin guardar</span>}
        {!saving && !dirty && savedAt && <span className="newq-saved">✓ Guardado</span>}
        {!saving && !dirty && !savedAt && <span className="newq-neutral">Sin cambios</span>}
      </div>
      <button
        className="newq-btn-primary"
        onClick={onSave}
        disabled={!canSave}
      >
        {saving ? 'Guardando…' : <><Save size={15} /> Guardar</>}
      </button>
    </div>
  );
}

export default function NewQuinielaPage({ matches = [], settings = {}, onReloadSettings }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', team: '' });
  const [error, setError] = useState('');
  const [windows, setWindows] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [filter, setFilter] = useState('open');
  const [draftRestorePrompt, setDraftRestorePrompt] = useState(null);
  const [hasSeenSaveHint, setHasSeenSaveHint] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  // Advertencia de salida con cambios sin guardar
  useEffect(() => {
    const handler = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => {
    fetchPredictionWindows().then(d => setWindows(d.windows || [])).catch(() => {});
  }, []);

  const activeWindow = useMemo(() => {
    const viable = windows.filter(w => ['open', 'scheduled', 'draft'].includes(getWindowStatus(w)));
    return viable.find(w => getWindowStatus(w) === 'open') || viable[0] || null;
  }, [windows]);

  const draftKey = profile && activeWindow
    ? `newq_draft_${activeWindow.id}_${profile.email}`
    : null;

  const continuationMatches = useMemo(() => {
    const startAt = settings.startAt ? Date.parse(settings.startAt) : 0;
    return matches
      .filter(match => {
        if (activeWindow?.matchIds?.length) return activeWindow.matchIds.map(String).includes(String(match.id));
        const kickoff = getMatchKickoff(match);
        if (!kickoff) return true;
        return !startAt || Date.parse(kickoff) >= startAt;
      })
      .sort((a, b) => (Date.parse(getMatchKickoff(a)) || 9e15) - (Date.parse(getMatchKickoff(b)) || 9e15));
  }, [activeWindow, matches, settings.startAt]);

  const openMatches    = useMemo(() => continuationMatches.filter(m => isMatchConfirmed(m) && !isMatchLocked(m)), [continuationMatches]);
  const pendingMatches = useMemo(() => continuationMatches.filter(m => !isMatchConfirmed(m)), [continuationMatches]);
  const lockedMatches  = useMemo(() => continuationMatches.filter(m => isMatchConfirmed(m) && isMatchLocked(m)), [continuationMatches]);

  const filteredMatches = useMemo(() => {
    return continuationMatches.filter(m => {
      if (filter === 'all') return true;
      if (filter === 'pending') return !isMatchConfirmed(m);
      if (filter === 'locked') return isMatchConfirmed(m) && isMatchLocked(m);
      if (filter === 'open') return isMatchConfirmed(m) && !isMatchLocked(m);
      return true;
    });
  }, [continuationMatches, filter]);

  const counts = useMemo(() => ({
    open: openMatches.length,
    pending: pendingMatches.length,
    locked: lockedMatches.length,
    all: continuationMatches.length
  }), [openMatches, pendingMatches, lockedMatches, continuationMatches]);

  const completedCount = useMemo(() => openMatches.filter(m => {
    const p = predictions[m.id];
    return p?.home !== '' && p?.home !== undefined && p?.away !== '' && p?.away !== undefined;
  }).length, [openMatches, predictions]);

  const loadExistingSubmission = async (targetEmail, windowId) => {
    if (!windowId) return;
    const data = await fetchPhaseSubmissions(windowId).catch(() => ({ submissions: [] }));
    const sub = (data.submissions || []).find(s => String(s.email).toLowerCase() === targetEmail);
    const key = `newq_draft_${windowId}_${targetEmail}`;
    const savedDraft = localStorage.getItem(key);
    if (sub) {
      setExistingSubmission(sub);
      const serverPreds = Object.fromEntries(Object.entries(sub.predictions || {}).map(([id, p]) => [id, { home: p.homeScore, away: p.awayScore }]));
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setDraftRestorePrompt({ draft, serverPreds });
          setPredictions(serverPreds);
        } catch (_) { setPredictions(serverPreds); }
      } else {
        setPredictions(serverPreds);
      }
    } else if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setDraftRestorePrompt({ draft, serverPreds: {} });
      } catch (_) {}
    }
  };

  const handleEmail = async (event) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    setError('');
    try {
      const data = await fetchContinuationProfile(value);
      const uType = data.exists ? (data.userType || 'existing') : 'new';
      if (data.exists) {
        setProfile({ ...data.profile, userType: uType });
        setNewUser({ name: data.profile.name, team: data.profile.team || inferTeamFromEmail(value) });
        await loadExistingSubmission(value, activeWindow?.id);
        recordPhaseProgress({ windowId: activeWindow?.id || '', email: value, participantName: data.profile.name, team: data.profile.team || inferTeamFromEmail(value), userType: uType, status: 'started' });
        setStep('board');
        requestAnimationFrame(() => { document.activeElement?.blur?.(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        return;
      }
      if (!data.allowedToRegister) {
        setError('No encontramos ese correo. Por ahora no hay registros nuevos.');
        return;
      }
      setProfile({ email: value, userType: 'new', team: data.inferredTeam || inferTeamFromEmail(value), avatar: initials(value) });
      setNewUser({ name: '', team: data.inferredTeam || inferTeamFromEmail(value) });
      await loadExistingSubmission(value, activeWindow?.id);
      recordPhaseProgress({ windowId: activeWindow?.id || '', email: value, participantName: '', team: data.inferredTeam || inferTeamFromEmail(value), userType: 'new', status: 'started' });
      setStep('new');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScore = (matchId, side, value) => {
    setDirty(true);
    setSavedAt(null);
    setPredictions(prev => {
      const next = { ...prev, [matchId]: { ...prev[matchId], [side]: scoreValue(value) } };
      if (profile?.email && activeWindow?.id) {
        const count = Object.values(next).filter(p => p?.home !== '' && p?.home !== undefined && p?.away !== '' && p?.away !== undefined).length;
        recordPhaseProgress({ windowId: activeWindow.id, email: profile.email, status: 'editing', predictionCount: count });
        try { localStorage.setItem(`newq_draft_${activeWindow.id}_${profile.email}`, JSON.stringify(next)); } catch (_) {}
      }
      if (!hasSeenSaveHint) setHasSeenSaveHint(true);
      return next;
    });
  };

  const save = async () => {
    if (!activeWindow?.id || !profile) {
      setError('No hay una ventana de pronósticos activa. El administrador debe abrir una ventana primero.');
      return;
    }
    const participantName = profile.userType === 'new' ? newUser.name.trim() : profile.name;
    const team = newUser.team || profile.team || inferTeamFromEmail(profile.email);
    if (!participantName) { setError('Captura tu nombre completo.'); setStep('new'); return; }
    const filled = Object.entries(predictions).filter(([, p]) => p?.home !== '' && p?.home !== undefined && p?.away !== '' && p?.away !== undefined);
    if (!filled.length) { setError('Ingresa al menos un pronóstico.'); return; }
    const payloadPreds = Object.fromEntries(filled.map(([id, p]) => [id, { homeScore: Number(p.home), awayScore: Number(p.away) }]));
    const matchMeta = Object.fromEntries(continuationMatches.map(m => [String(m.id), m]));
    setSaving(true); setError('');
    try {
      const result = await savePhaseSubmission({ email: profile.email, windowId: activeWindow.id, participantName, team, userType: profile.userType, predictions: payloadPreds, matchMeta });
      setExistingSubmission(result.submission);
      setSavedAt(new Date());
      setDirty(false);
      if (draftKey) localStorage.removeItem(draftKey);
      recordPhaseProgress({ windowId: activeWindow.id, email: profile.email, participantName, team, userType: profile.userType, status: 'submitted', predictionCount: filled.length });
      document.activeElement?.blur?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasPredictions = Object.values(predictions).some(
    p => p?.home !== '' && p?.home !== undefined && p?.away !== '' && p?.away !== undefined
  );
  const canSave = dirty && hasPredictions && !saving;

  const displayProfile = profile ? {
    name: profile.userType === 'new' ? (newUser.name || 'Nuevo participante') : profile.name,
    email: profile.email,
    team: newUser.team || profile.team,
    avatar: profile.avatar || initials(profile.name || profile.email),
    photo: profile.photo || ''
  } : null;

  if (settings.emergencyMode) {
    return (
      <section className="new-quiniela-page">
        <div className="newq-shell">
          <div className="newq-hero">
            <div>
              <span className="newq-kicker">Mantenimiento</span>
              <h1>Nueva quiniela en pausa</h1>
              <p>{settings.emergencyMessage || 'Estamos ajustando la nueva quiniela. Intenta de nuevo más tarde.'}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="new-quiniela-page">
      <div className="newq-shell">

        {/* Hero */}
        <div className="newq-hero">
          <div>
            <span className="newq-kicker">Continuación Mundialista</span>
            <h1>Nueva quiniela mundialista</h1>
            <p>La Quiniela RH ya cerró con la fase de grupos. Esta es una nueva etapa para quienes quieren seguir pronosticando.</p>
          </div>
        </div>

        {/* Step: email */}
        {step === 'email' && (
          <div className="newq-email-card">
            <h2>Ingresa tu correo</h2>
            <p className="newq-email-hint">Usa tu correo corporativo para acceder a tus pronósticos.</p>
            <form onSubmit={handleEmail} className="newq-email-form">
              <input
                ref={emailRef}
                type="email"
                className="newq-email-input"
                placeholder="tu.correo@empresa.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
              />
              {error && <p className="newq-error">{error}</p>}
              <button type="submit" className="newq-btn-primary">Continuar →</button>
            </form>
          </div>
        )}

        {/* Step: new user registration */}
        {step === 'new' && (
          <div className="newq-email-card">
            <h2>Regístrate</h2>
            <p className="newq-email-hint">No encontramos ese correo en la Quiniela RH, pero puedes registrarte para la Nueva Quiniela.</p>
            <div className="newq-new-user-form">
              <label className="newq-field-label">
                Nombre completo
                <input className="newq-email-input" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Nombre Apellido" />
              </label>
              <label className="newq-field-label">
                Equipo
                <select className="newq-email-input" value={newUser.team} onChange={e => setNewUser(p => ({ ...p, team: e.target.value }))}>
                  <option value="">Seleccionar</option>
                  <option value="bz">Team BZ</option>
                  <option value="up">Team UP</option>
                </select>
              </label>
              {error && <p className="newq-error">{error}</p>}
              <button className="newq-btn-primary" onClick={() => { if (!newUser.name.trim()) { setError('Escribe tu nombre completo.'); return; } setError(''); setStep('board'); }}>
                Continuar a mis apuestas →
              </button>
            </div>
          </div>
        )}

        {/* Profile + Board */}
        {displayProfile && step === 'board' && (
          <>
            {/* Profile card */}
            <div className="newq-profile-card">
              <div className="newq-profile-main">
                <div className="newq-profile-avatar">
                  {displayProfile.photo
                    ? <img src={displayProfile.photo} alt={displayProfile.name} />
                    : <span>{displayProfile.avatar}</span>}
                </div>
                <div className="newq-profile-info">
                  <h2>{displayProfile.name}</h2>
                  <p>{displayProfile.email}</p>
                  {displayProfile.team && (
                    <span className={`newq-team-chip ${displayProfile.team}`}>{teamLabel(displayProfile.team)}</span>
                  )}
                </div>
              </div>
              <div className="newq-profile-stats">
                <CapitalHumanoSummary history={profile.capitalHumano} />
                <NuevaQuinielaSummary submission={existingSubmission} />
              </div>
            </div>

            {/* Draft restore prompt */}
            {draftRestorePrompt && (
              <div className="newq-draft-banner">
                <span>Encontramos cambios sin guardar en este dispositivo.</span>
                <div className="newq-draft-actions">
                  <button className="newq-btn-secondary" onClick={() => {
                    setPredictions(draftRestorePrompt.draft);
                    setDirty(true);
                    setDraftRestorePrompt(null);
                  }}>Restaurar</button>
                  <button className="newq-btn-secondary muted" onClick={() => {
                    if (draftKey) localStorage.removeItem(draftKey);
                    setDraftRestorePrompt(null);
                  }}>Descartar</button>
                </div>
              </div>
            )}

            {/* Submission status */}
            {existingSubmission && !dirty && (
              <div className={`newq-submission-status status-${existingSubmission.status || 'pending'}`}>
                {(existingSubmission.status === 'pending' || !existingSubmission.status) && (
                  <><CheckCircle2 size={16} /> Tus pronósticos están <strong>pendientes de revisión</strong>. Puedes volver más tarde para ver si ya fueron aprobados.</>
                )}
                {existingSubmission.status === 'approved' && (
                  <><CheckCircle2 size={16} /> Tu quiniela fue <strong>aprobada</strong> y ya aparece en la tabla general.</>
                )}
                {existingSubmission.status === 'edited' && (
                  <><CheckCircle2 size={16} /> Tu quiniela actualizada está <strong>pendiente de revisión</strong>.</>
                )}
                {existingSubmission.status === 'rejected' && (
                  <>Tu quiniela fue <strong>rechazada</strong>.{existingSubmission.rejectedReason ? ` Motivo: ${existingSubmission.rejectedReason}` : ''} Puedes corregir y volver a guardar.</>
                )}
              </div>
            )}

            {/* No active window warning */}
            {!activeWindow && (
              <div className="newq-error" style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--error-bg, #fef2f2)' }}>
                No hay una ventana de pronósticos activa. El administrador debe crear o abrir una ventana para habilitar el guardado.
              </div>
            )}

            {/* Board — Desktop */}
            <div className="newq-desktop-board">
              <div className="newq-board">
                <div className="newq-board-header">
                  <div>
                    <h2>Mis apuestas</h2>
                    <p>Cierre {LOCK_MINUTES_BEFORE_KICKOFF} minutos antes de cada partido.</p>
                  </div>
                  <div className="newq-board-actions">
                    <div className="newq-save-status">
                      {dirty && !saving && <span className="newq-unsaved">Cambios sin guardar</span>}
                      {saving && <span className="newq-saving">Guardando...</span>}
                      {savedAt && !dirty && !saving && <span className="newq-saved">✓ Guardado correctamente</span>}
                      {!dirty && !savedAt && !saving && <span className="newq-neutral">Sin cambios</span>}
                    </div>
                    <button className="newq-btn-primary newq-inline-save" onClick={save} disabled={!canSave}>
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="newq-filters">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      className={`newq-filter-btn${filter === f.key ? ' active' : ''}`}
                      onClick={() => setFilter(f.key)}
                    >
                      {f.label}
                      {counts[f.key] > 0 && <span className="newq-filter-count">{counts[f.key]}</span>}
                    </button>
                  ))}
                </div>

                {/* Matches grouped by date */}
                {filteredMatches.length === 0 ? (
                  <div className="newq-empty">
                    {filter === 'open' ? 'No hay partidos abiertos para pronosticar en este momento.' : 'Sin partidos en esta categoría.'}
                  </div>
                ) : (
                  Object.entries(groupMatchesByDate(filteredMatches)).map(([dateLabel, items]) => (
                    <section key={dateLabel} className="newq-date-group">
                      <h3 className="newq-date-label">{dateLabel}</h3>
                      <div className="newq-match-grid">
                        {items.map(match => (
                          <PhaseMatchPredictionCard
                            key={match.id}
                            match={match}
                            pred={predictions[match.id] || {}}
                            onChange={handleScore}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                )}

                {error && <p className="newq-error" style={{ marginTop: '0.75rem' }}>{error}</p>}
              </div>
            </div>

            {/* Board — Mobile snap carrusel */}
            <div className="newq-mobile-board">
              <div className="newq-mobile-board-header">
                <span className="newq-mobile-progress">
                  {completedCount} de {openMatches.length} partidos llenados
                </span>
                <div className="newq-save-status">
                  {dirty && !saving && <span className="newq-unsaved">Sin guardar</span>}
                  {saving && <span className="newq-saving">Guardando...</span>}
                  {savedAt && !dirty && !saving && <span className="newq-saved">✓ Guardado</span>}
                </div>
              </div>

              <div className="newq-match-snap-list">
                {openMatches.length === 0 && (
                  <div className="newq-match-snap-item">
                    <div className="newq-empty">No hay partidos abiertos para pronosticar.</div>
                  </div>
                )}
                {openMatches.map((match, idx) => (
                  <div key={match.id} className="newq-match-snap-item">
                    <span className="newq-snap-counter">Partido {idx + 1} de {openMatches.length}</span>
                    <PhaseMatchPredictionCard
                      match={match}
                      pred={predictions[match.id] || {}}
                      onChange={handleScore}
                    />
                  </div>
                ))}

                {/* Pending matches accordion */}
                {pendingMatches.length > 0 && (
                  <div className="newq-match-snap-item newq-snap-accordion-item">
                    <details className="newq-snap-accordion">
                      <summary>
                        Por confirmar ({pendingMatches.length})
                        <ChevronDown size={16} className="newq-acc-chevron" />
                      </summary>
                      <div className="newq-acc-body">
                        {pendingMatches.map(match => (
                          <PhaseMatchPredictionCard
                            key={match.id}
                            match={match}
                            pred={predictions[match.id] || {}}
                            onChange={handleScore}
                          />
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Locked matches accordion */}
                {lockedMatches.length > 0 && (
                  <div className="newq-match-snap-item newq-snap-accordion-item">
                    <details className="newq-snap-accordion">
                      <summary>
                        Cerrados ({lockedMatches.length})
                        <ChevronDown size={16} className="newq-acc-chevron" />
                      </summary>
                      <div className="newq-acc-body">
                        {lockedMatches.map(match => (
                          <PhaseMatchPredictionCard
                            key={match.id}
                            match={match}
                            pred={predictions[match.id] || {}}
                            onChange={handleScore}
                          />
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {error && <p className="newq-error" style={{ margin: '0 1rem 1rem' }}>{error}</p>}

              {/* Single mobile save bar */}
              <MobileSaveBar dirty={dirty} saving={saving} savedAt={savedAt} canSave={canSave} onSave={save} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
