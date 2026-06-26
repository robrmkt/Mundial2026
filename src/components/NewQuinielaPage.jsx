import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Clock, Lock, CheckCircle2 } from 'lucide-react';
import FlagIcon from './FlagIcon';
import { fetchContinuationProfile, inferTeamFromEmail, teamLabel } from '../services/continuation';
import { fetchPredictionWindows, fetchPhaseSubmissions, getWindowStatus, savePhaseSubmission } from '../services/predictionWindows';
import { getMatchKickoff, isMatchConfirmed, isMatchLocked, getMatchLockAt, LOCK_MINUTES_BEFORE_KICKOFF } from '../services/matchLock';

function formatWhen(value) {
  if (!value) return 'Horario por confirmar';
  return new Date(value).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(nameOrEmail) {
  return String(nameOrEmail || 'NQ').split('@')[0].replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'NQ';
}

function buildMatchMeta(match) {
  return {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoff: getMatchKickoff(match),
    status: match.status
  };
}

function scoreValue(value) {
  if (value === '') return '';
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return '';
  return Math.max(0, Math.min(99, parsed));
}

export default function NewQuinielaPage({ matches = [], settings = {} }) {
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
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);
  useEffect(() => {
    fetchPredictionWindows().then(d => setWindows(d.windows || [])).catch(() => {});
  }, []);

  const activeWindow = useMemo(() => {
    const viable = windows.filter(w => ['open', 'scheduled', 'draft'].includes(getWindowStatus(w)));
    return viable.find(w => getWindowStatus(w) === 'open') || viable[0] || null;
  }, [windows]);

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

  const confirmedMatches = continuationMatches.filter(m => isMatchConfirmed(m));
  const pendingMatches = continuationMatches.filter(m => !isMatchConfirmed(m));

  const loadExistingSubmission = async (targetEmail, windowId) => {
    if (!windowId) return;
    const data = await fetchPhaseSubmissions(windowId).catch(() => ({ submissions: [] }));
    const sub = (data.submissions || []).find(s => String(s.email).toLowerCase() === targetEmail);
    if (!sub) return;
    setExistingSubmission(sub);
    setPredictions(Object.fromEntries(Object.entries(sub.predictions || {}).map(([id, p]) => [id, { home: p.homeScore, away: p.awayScore }])));
  };

  const handleEmail = async (event) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    setError('');
    try {
      const data = await fetchContinuationProfile(value);
      if (data.exists) {
        setProfile({ ...data.profile, userType: data.userType || 'existing' });
        setNewUser({ name: data.profile.name, team: data.profile.team || inferTeamFromEmail(value) });
        await loadExistingSubmission(value, activeWindow?.id);
        setStep('profile');
        return;
      }
      if (!data.allowedToRegister) {
        setError('No encontramos ese correo y por ahora no hay registros nuevos.');
        return;
      }
      setProfile({ email: value, userType: 'new', team: data.inferredTeam || inferTeamFromEmail(value), avatar: initials(value) });
      setNewUser({ name: '', team: data.inferredTeam || inferTeamFromEmail(value) });
      await loadExistingSubmission(value, activeWindow?.id);
      setStep('new');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScore = (matchId, side, value) => {
    setDirty(true);
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: scoreValue(value) } }));
  };

  const save = async () => {
    if (!activeWindow?.id || !profile) return;
    const participantName = profile.userType === 'new' ? newUser.name.trim() : profile.name;
    const team = newUser.team || profile.team || inferTeamFromEmail(profile.email);
    if (!participantName) { setError('Captura tu nombre completo.'); setStep('new'); return; }
    const filled = Object.entries(predictions).filter(([, p]) => p?.home !== '' && p?.home !== undefined && p?.away !== '' && p?.away !== undefined);
    if (!filled.length) { setError('Ingresa al menos un pronóstico.'); return; }
    const matchMeta = Object.fromEntries(confirmedMatches.map(m => [String(m.id), buildMatchMeta(m)]));
    const payloadPreds = Object.fromEntries(filled.map(([id, p]) => [id, { homeScore: Number(p.home), awayScore: Number(p.away) }]));
    setSaving(true);
    setError('');
    try {
      const result = await savePhaseSubmission({
        email: profile.email,
        windowId: activeWindow.id,
        participantName,
        team,
        userType: profile.userType,
        predictions: payloadPreds,
        matchMeta
      });
      setExistingSubmission(result.submission);
      setSavedAt(new Date());
      setDirty(false);
      setStep('saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayProfile = profile ? {
    name: profile.userType === 'new' ? (newUser.name || 'Nuevo participante') : profile.name,
    email: profile.email,
    team: newUser.team || profile.team,
    avatar: profile.avatar || initials(profile.name || profile.email),
    photo: profile.photo || ''
  } : null;

  return (
    <section className="new-quiniela-page">
      <div className="new-quiniela-hero">
        <span className="section-kicker">Continuación</span>
        <h2>Nueva quiniela</h2>
        <p>Continúa pronosticando los siguientes partidos del Mundial. La quiniela de Capital Humano queda como histórico separado.</p>
      </div>

      {step === 'email' && (
        <form className="new-quiniela-email" onSubmit={handleEmail}>
          <label>
            Correo corporativo
            <input ref={emailRef} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu.correo@empresa.com" />
          </label>
          {error && <p className="phase-email-error">{error}</p>}
          <button type="submit" className="phase-submit-btn">Siguiente</button>
        </form>
      )}

      {step === 'new' && (
        <div className="new-user-card">
          <p>No encontramos ese correo en la quiniela anterior, pero puedes registrarte para la nueva etapa.</p>
          <label>Nombre completo<input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} /></label>
          <label>Team<select value={newUser.team} onChange={e => setNewUser(p => ({ ...p, team: e.target.value }))}><option value="">Seleccionar</option><option value="bz">Team BZ</option><option value="up">Team UP</option></select></label>
          {error && <p className="phase-email-error">{error}</p>}
          <button className="phase-submit-btn" onClick={() => setStep('profile')}>Continuar a mis apuestas</button>
        </div>
      )}

      {displayProfile && ['profile', 'saved'].includes(step) && (
        <>
          <div className="user-prediction-profile">
            <div className="profile-avatar">{displayProfile.photo ? <img src={displayProfile.photo} alt={displayProfile.name} /> : displayProfile.avatar}</div>
            <div>
              <h3>{displayProfile.name}</h3>
              <p>{displayProfile.email}</p>
              <span>{teamLabel(displayProfile.team)}</span>
            </div>
            <div className="profile-stat"><small>Histórico Capital Humano</small><strong>{profile.capitalHumanoRank ? `#${profile.capitalHumanoRank} · ${profile.capitalHumanoPoints} pts` : 'Sin histórico'}</strong></div>
            <div className="profile-stat"><small>Nueva quiniela</small><strong>{existingSubmission ? `${Object.keys(existingSubmission.predictions || {}).length} pronósticos · ${existingSubmission.status || 'pending'}` : 'Sin pronósticos todavía'}</strong></div>
          </div>

          {step === 'saved' && (
            <div className="phase-save-notice"><CheckCircle2 size={18} /> Tus pronósticos fueron recibidos y quedarán pendientes de revisión por el administrador.</div>
          )}

          <div className="phase-prediction-board">
            <div className="phase-board-head">
              <div><h3>Mis apuestas</h3><p>{activeWindow?.name || 'Nueva quiniela'} · cierre {LOCK_MINUTES_BEFORE_KICKOFF} min antes de cada partido</p></div>
              {dirty && <span className="unsaved-chip">Cambios sin guardar</span>}
              {savedAt && !dirty && <span className="saved-chip">Guardado hace unos segundos</span>}
            </div>

            <h4>Partidos confirmados</h4>
            <div className="phase-match-list-v2">
              {confirmedMatches.length === 0 ? <p className="phase-form-hint">No hay partidos confirmados todavía.</p> : confirmedMatches.map(match => {
                const locked = isMatchLocked(match);
                const pred = predictions[match.id] || {};
                return (
                  <div key={match.id} className={`phase-match-card-v2 ${locked ? 'is-locked' : ''}`}>
                    <div className="phase-match-main">
                      <span><FlagIcon team={match.homeTeam} size={18} /> {match.homeTeam}</span>
                      <strong>vs</strong>
                      <span><FlagIcon team={match.awayTeam} size={18} /> {match.awayTeam}</span>
                    </div>
                    <div className="phase-match-meta"><Clock size={13} /> {formatWhen(getMatchKickoff(match))} · cierra {formatWhen(getMatchLockAt(match))}</div>
                    {locked ? <div className="phase-locked-inline"><Lock size={14} /> Este partido ya cerró para pronósticos.</div> : (
                      <div className="phase-score-inputs">
                        <input type="number" min="0" max="99" value={pred.home ?? ''} onChange={e => handleScore(match.id, 'home', e.target.value)} placeholder="0" />
                        <span>-</span>
                        <input type="number" min="0" max="99" value={pred.away ?? ''} onChange={e => handleScore(match.id, 'away', e.target.value)} placeholder="0" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <h4>Partidos por confirmar</h4>
            <div className="phase-match-list-v2">
              {pendingMatches.length === 0 ? <p className="phase-form-hint">No hay cruces pendientes por confirmar.</p> : pendingMatches.map(match => (
                <div key={match.id} className="phase-match-card-v2 is-pending">
                  <div className="phase-match-main"><span>{match.homeTeam || 'Por definir'}</span><strong>vs</strong><span>{match.awayTeam || 'Por definir'}</span></div>
                  <p>Este cruce se activará cuando se confirmen los equipos y horario.</p>
                </div>
              ))}
            </div>

            {error && <p className="phase-email-error">{error}</p>}
            <div className="phase-sticky-save">
              <button className="phase-submit-btn" onClick={save} disabled={saving}>{saving ? 'Guardando…' : <><Save size={15} /> Guardar cambios</>}</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
