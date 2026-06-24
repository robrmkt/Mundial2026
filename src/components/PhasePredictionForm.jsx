import { useEffect, useRef, useState } from 'react';
import FlagIcon from './FlagIcon';
import { fetchPredictionWindows, getWindowStatus, savePhaseSubmission, fetchPhaseSubmissions } from '../services/predictionWindows';
import { getRosterEntryByEmail } from '../services/participantEmails';

function formatMatchDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function isMatchLocked(match) {
  if (!match.utcDate) return false;
  const kickoff = Date.parse(match.utcDate);
  return Date.now() >= kickoff - 24 * 60 * 60 * 1000;
}

export default function PhasePredictionForm({ matches, previewMode = false, onClose }) {
  const [step, setStep] = useState('email'); // email | form | saved
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [participant, setParticipant] = useState(null);
  const [activeWindow, setActiveWindow] = useState(null);
  const [preds, setPreds] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedSubmission, setSavedSubmission] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  useEffect(() => {
    fetchPredictionWindows()
      .then(d => {
        const wins = d.windows || [];
        const active = wins.find(w => ['open', 'scheduled', 'draft'].includes(getWindowStatus(w)));
        if (active || wins.length > 0) setActiveWindow(active || wins[wins.length - 1]);
      })
      .catch(() => {});
  }, []);

  const activeMatches = matches.filter(m => {
    if (activeWindow?.matchIds?.length) return activeWindow.matchIds.includes(m.id);
    // Default: show scheduled matches from R16 onwards (id > 48 or status SCHEDULED with no score yet)
    return m.status === 'SCHEDULED' && m.id > 48;
  });

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const val = email.trim().toLowerCase();
    if (!val || !val.includes('@')) { setEmailError('Ingresa un correo válido.'); return; }
    const roster = getRosterEntryByEmail(val);
    if (!roster && !previewMode) { setEmailError('No encontré ese correo en la lista de participantes. Verifica con el organizador.'); return; }
    setParticipant(roster || { name: val, email: val, team: null });
    setEmailError('');
    // Check for existing submission
    if (activeWindow?.id) {
      fetchPhaseSubmissions(activeWindow.id)
        .then(d => {
          const existing = (d.submissions || []).find(s => s.email === val);
          if (existing) { setExistingSubmission(existing); setPreds(existing.predictions || {}); }
        })
        .catch(() => {});
    }
    setStep('form');
  };

  const handleScore = (matchId, side, val) => {
    const num = val === '' ? '' : Math.max(0, Math.min(99, parseInt(val, 10) || 0));
    setPreds(p => ({ ...p, [matchId]: { ...p[matchId], [side]: num === '' ? '' : num } }));
  };

  const handleSave = async () => {
    if (!activeWindow?.id) return;
    const filled = Object.entries(preds).filter(([, p]) => p.home !== '' && p.home !== undefined && p.away !== '' && p.away !== undefined);
    if (filled.length === 0) { alert('Ingresa al menos un pronóstico.'); return; }
    setSaving(true);
    try {
      const predictions = Object.fromEntries(filled.map(([id, p]) => [id, { homeScore: Number(p.home), awayScore: Number(p.away) }]));
      const result = await savePhaseSubmission({ email: participant.email, windowId: activeWindow.id, participantName: participant.name, predictions });
      setSavedSubmission(result.submission);
      setStep('saved');
    } catch (e) {
      alert(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const status = activeWindow ? getWindowStatus(activeWindow) : null;
  const isOpen = previewMode || status === 'open';

  return (
    <div className="phase-form-overlay">
      <div className="phase-form-modal">
        <div className="phase-form-header">
          <div>
            <span className="phase-form-tag">⚽ Segunda fase · Quiniela</span>
            <h2>{activeWindow?.name || 'Pronósticos de fase'}</h2>
          </div>
          {onClose && <button className="phase-form-close" onClick={onClose}>✕</button>}
        </div>

        {previewMode && (
          <div className="phase-form-preview-banner">Vista previa de admin — los datos no se guardan realmente</div>
        )}

        {/* STEP: email */}
        {step === 'email' && (
          <div className="phase-form-step">
            {!isOpen && status === 'scheduled' && (
              <p className="phase-form-hint">Esta ventana aún no está abierta.</p>
            )}
            {!isOpen && status === 'closed' && (
              <p className="phase-form-hint">Esta ventana ya cerró. El plazo para enviar pronósticos terminó.</p>
            )}
            {!activeWindow && (
              <p className="phase-form-hint">No hay ventanas de pronóstico activas en este momento.</p>
            )}
            {(isOpen || status === 'scheduled') && (
              <>
                <p className="phase-form-desc">Ingresa tu correo para acceder a tus pronósticos de esta fase.</p>
                <form onSubmit={handleEmailSubmit} className="phase-email-form">
                  <input
                    ref={emailRef}
                    type="email"
                    className="phase-email-input"
                    placeholder="tu.correo@empresa.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                    autoComplete="email"
                  />
                  {emailError && <p className="phase-email-error">{emailError}</p>}
                  <button type="submit" className="phase-submit-btn" disabled={!isOpen}>
                    {isOpen ? 'Continuar →' : 'Ventana no abierta'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* STEP: form */}
        {step === 'form' && (
          <div className="phase-form-step">
            <div className="phase-form-who">
              <strong>{participant?.name}</strong>
              <span>{participant?.email}</span>
              {existingSubmission && <span className="phase-form-existing-badge">Ya tienes pronósticos guardados — puedes actualizarlos</span>}
            </div>

            {activeMatches.length === 0 ? (
              <p className="phase-form-hint">No hay partidos disponibles para esta ventana todavía.</p>
            ) : (
              <div className="phase-matches-list">
                {activeMatches.map(m => {
                  const pred = preds[m.id] || {};
                  const locked = isMatchLocked(m) && !previewMode;
                  return (
                    <div key={m.id} className={`phase-match-row ${locked ? 'locked' : ''}`}>
                      <div className="phase-match-teams">
                        <span className="phase-match-team"><FlagIcon team={m.homeTeam} size={16} /> {m.homeTeam}</span>
                        <span className="phase-match-vs">vs</span>
                        <span className="phase-match-team"><FlagIcon team={m.awayTeam} size={16} /> {m.awayTeam}</span>
                      </div>
                      <div className="phase-match-date">{formatMatchDate(m.utcDate)}</div>
                      {locked ? (
                        <div className="phase-match-locked">🔒 Cerrado</div>
                      ) : (
                        <div className="phase-score-inputs">
                          <input
                            type="number" min="0" max="99"
                            className="phase-score-input"
                            value={pred.home ?? ''}
                            onChange={e => handleScore(m.id, 'home', e.target.value)}
                            placeholder="—"
                          />
                          <span className="phase-score-sep">–</span>
                          <input
                            type="number" min="0" max="99"
                            className="phase-score-input"
                            value={pred.away ?? ''}
                            onChange={e => handleScore(m.id, 'away', e.target.value)}
                            placeholder="—"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="phase-form-actions">
              <button className="phase-back-btn" onClick={() => setStep('email')}>← Atrás</button>
              <button className="phase-submit-btn" onClick={handleSave} disabled={saving || activeMatches.length === 0}>
                {saving ? 'Guardando…' : existingSubmission ? 'Actualizar pronósticos' : 'Guardar pronósticos'}
              </button>
            </div>
          </div>
        )}

        {/* STEP: saved */}
        {step === 'saved' && savedSubmission && (
          <div className="phase-form-step phase-saved-step">
            <div className="phase-saved-icon">✅</div>
            <h3>¡Pronósticos guardados!</h3>
            <p className="phase-form-desc">{participant?.name}, tus pronósticos para <strong>{activeWindow?.name}</strong> quedaron registrados.</p>
            <div className="phase-saved-summary">
              {Object.entries(savedSubmission.predictions || {}).map(([id, p]) => {
                const m = matches.find(x => String(x.id) === String(id));
                if (!m) return null;
                return (
                  <div key={id} className="phase-saved-row">
                    <span>{m.homeTeam} <strong>{p.homeScore} – {p.awayScore}</strong> {m.awayTeam}</span>
                  </div>
                );
              })}
            </div>
            <button className="phase-submit-btn" onClick={() => { setStep('email'); setEmail(''); setParticipant(null); setPreds({}); setSavedSubmission(null); setExistingSubmission(null); }}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
