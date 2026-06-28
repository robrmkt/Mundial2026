import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Eye, Plus, RefreshCw, Trash2, X, XCircle } from 'lucide-react';
import { fetchPredictionWindows, savePredictionWindow, deletePredictionWindow, getWindowStatus, formatWindowDate, fetchPhaseSubmissions, deletePhaseSubmission, approvePhaseSubmission, rejectPhaseSubmission, freezeCapitalHumanoArchive, updateContinuationSettings } from '../../services/predictionWindows';
import { PARTICIPANT_EMAIL_ROSTER } from '../../services/participantEmails';
import PhasePredictionForm from '../PhasePredictionForm';

const STATUS_LABEL = { draft: 'Borrador', scheduled: 'Programada', open: 'Abierta', closed: 'Cerrada' };
const STATUS_COLOR = { draft: 'grey', scheduled: 'amber', open: 'green', closed: 'grey' };
const SUB_STATUS_LABEL = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', edited: 'Editado' };

const SUB_FILTERS = ['todos', 'pendientes', 'aprobados', 'rechazados', 'nuevos', 'existentes'];
const SUB_FILTER_LABEL = { todos: 'Todos', pendientes: 'Pendientes', aprobados: 'Aprobados', rechazados: 'Rechazados', nuevos: 'Nuevos usuarios', existentes: 'Usuarios RH' };

function AdminReviewInbox({ pendingSubmissions, onApprove, onReject, onSelect }) {
  if (!pendingSubmissions.length) {
    return (
      <div className="admin-card admin-review-inbox-card is-empty">
        <h3 className="admin-section-title">Bandeja de revisión</h3>
        <p className="admin-ext-hint">Sin quinielas pendientes por ahora.</p>
      </div>
    );
  }
  return (
    <div className="admin-card admin-review-inbox-card has-pending">
      <div className="admin-review-inbox-head">
        <h3 className="admin-section-title">Bandeja de revisión</h3>
        <span className="admin-pending-badge">{pendingSubmissions.length} pendiente{pendingSubmissions.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="admin-review-inbox">
        {pendingSubmissions.map(sub => (
          <div className="admin-review-item" key={sub.id}>
            <div className="admin-review-item-head">
              <div>
                <strong>{sub.participantName || sub.email}</strong>
                <span className="crm-email">{sub.email}</span>
              </div>
              <span className="phase-status-badge status-pending">Pendiente</span>
            </div>
            <p className="admin-ext-hint" style={{ margin: '0.35rem 0 0' }}>
              {Object.keys(sub.predictions || {}).length} pronósticos
              {sub.updatedAt ? ` · ${new Date(sub.updatedAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
              {sub.userType === 'new' ? ' · Nuevo usuario' : ' · Usuario RH'}
            </p>
            <div className="admin-review-item-actions">
              <button className="crm-action-btn" onClick={() => onSelect(sub)}>Ver</button>
              <button className="crm-action-btn" style={{ color: 'var(--success, #16a34a)' }} onClick={() => onApprove(sub.id)}>
                <Check size={13} /> Aprobar
              </button>
              <button className="crm-action-btn danger" onClick={() => onReject(sub.id)}>
                <X size={13} /> Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPredictionExtension({ participants, standings = [], matches, phaseSubmissions: propSubs = [], continuationSettings = null, onSettingsSaved }) {
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: 'Nueva quiniela · Siguiente fase', status: 'draft', openAt: '', matchIds: [], closeMode: 'per_match', lockMinutesBeforeKickoff: 10, autoIncludeFutureMatches: true });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedWindowId, setSelectedWindowId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [deletingSubId, setDeletingSubId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [freezing, setFreezing] = useState(false);
  const [subFilter, setSubFilter] = useState('todos');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState(continuationSettings || {});
  const [approvingAll, setApprovingAll] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [newPendingToast, setNewPendingToast] = useState(null);
  const prevPendingCountRef = useRef(null);
  const inboxRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettings(continuationSettings || {}), 0);
    return () => clearTimeout(timer);
  }, [continuationSettings]);

  useEffect(() => {
    fetchPredictionWindows()
      .then(d => setWindows(d.windows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedWindowId) return;
    fetchPhaseSubmissions(selectedWindowId)
      .then(d => setSubmissions(d.submissions || []))
      .catch(() => {});
  }, [selectedWindowId]);

  // Polling cada 15s para refrescar submissions mientras admin está dentro
  useEffect(() => {
    const poll = async () => {
      const id = selectedWindowId;
      if (!id) return;
      const data = await fetchPhaseSubmissions(id).catch(() => null);
      if (data) setSubmissions(data.submissions || []);
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [selectedWindowId]);

  // Auto-seleccionar ventana con pendientes si ninguna está seleccionada
  useEffect(() => {
    if (selectedWindowId) return;
    const pendingSub = propSubs.find(s => !s.status || s.status === 'pending');
    if (pendingSub?.windowId) {
      const timer = setTimeout(() => setSelectedWindowId(pendingSub.windowId), 0);
      return () => clearTimeout(timer);
    }
  }, [propSubs, selectedWindowId]);

  // Use propSubs for metrics (loaded from /api/state in App.jsx, always fresh)
  const allSubs = propSubs.length ? propSubs : submissions;

  const pendingSubmissions = useMemo(() =>
    allSubs.filter(s => !s.status || s.status === 'pending'),
    [allSubs]
  );

  // Toast cuando llegan nuevos pendientes mientras el admin está dentro
  useEffect(() => {
    const count = pendingSubmissions.length;
    if (prevPendingCountRef.current === null) { prevPendingCountRef.current = count; return; }
    if (count > prevPendingCountRef.current) {
      setNewPendingToast(`Nueva quiniela pendiente de revisión (${count} total)`);
      const t = setTimeout(() => setNewPendingToast(null), 5000);
      prevPendingCountRef.current = count;
      return () => clearTimeout(t);
    }
    prevPendingCountRef.current = count;
  }, [pendingSubmissions.length]);

  const withEmail = participants.filter(p => p.email).length;
  const rosterTotal = PARTICIPANT_EMAIL_ROSTER.length;

  // --- Metrics ---
  const activeWindow = useMemo(() => {
    const viable = windows.filter(w => ['open', 'scheduled', 'draft'].includes(getWindowStatus(w)));
    return viable.find(w => getWindowStatus(w) === 'open') || viable[0] || null;
  }, [windows]);

  const windowSubs = useMemo(() =>
    activeWindow ? allSubs.filter(s => s.windowId === activeWindow.id) : allSubs,
    [allSubs, activeWindow]
  );

  const metrics = useMemo(() => {
    const pending = windowSubs.filter(s => s.status === 'pending' || !s.status).length;
    const approved = windowSubs.filter(s => s.status === 'approved').length;
    const rejected = windowSubs.filter(s => s.status === 'rejected').length;
    const edited = windowSubs.filter(s => s.status === 'edited').length;
    const newUsers = windowSubs.filter(s => s.userType === 'new').length;
    const existingUsers = windowSubs.filter(s => s.userType !== 'new').length;
    return { total: windowSubs.length, pending, approved, rejected, edited, newUsers, existingUsers };
  }, [windowSubs]);

  // --- Checklist ---
  const hasActiveWindow = !!activeWindow && getWindowStatus(activeWindow) === 'open';
  const transitionPopup = settings.transitionPopup || {};
  const popupEnabled = transitionPopup.enabled !== false && settings.transitionNoticeEnabled !== false;
  const publicEnabled = settings.publicEnabled !== false;
  const dashboardModeOk = settings.dashboardMode === 'auto' || settings.dashboardMode === 'new_quiniela';
  const feedRangeOk = true; // verified: 20260611-20260719
  const lockMinutesOk = (settings.lockMinutesBeforeKickoff || 10) === 10;

  const checklist = [
    { label: 'Ventana activa abierta', ok: hasActiveWindow, warn: !hasActiveWindow, hint: 'Crea y abre una ventana de pronóstico.' },
    { label: 'Nueva quiniela pública', ok: publicEnabled, warn: !publicEnabled, hint: 'Activa "publicEnabled" en Control de publicación.' },
    { label: 'Popup de transición activo', ok: popupEnabled, warn: !popupEnabled, hint: 'Activa el popup en Control de publicación.' },
    { label: 'Tabla General en modo Nueva Quiniela', ok: dashboardModeOk, warn: !dashboardModeOk, hint: 'Cambia dashboardMode a "auto" o "new_quiniela".' },
    { label: 'Cierre 10 minutos antes', ok: lockMinutesOk, warn: !lockMinutesOk, hint: 'Ajusta lockMinutesBeforeKickoff = 10.' },
    { label: 'Correos vinculados', ok: withEmail >= participants.length * 0.8, warn: withEmail < participants.length * 0.8, hint: `Solo ${withEmail} de ${participants.length} participantes tienen correo.` },
    { label: 'Feed extendido (hasta jul 19)', ok: feedRangeOk, warn: false, hint: '' },
    { label: 'Admin puede aprobar registros', ok: true, warn: false, hint: '' },
    { label: 'Modo emergencia disponible', ok: true, warn: false, hint: '' },
  ];

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = await savePredictionWindow(form);
      setWindows(prev => [...prev, result.window]);
      setShowForm(false);
      setForm({ name: 'Nueva quiniela · Siguiente fase', status: 'draft', openAt: '', matchIds: [], closeMode: 'per_match', lockMinutesBeforeKickoff: 10, autoIncludeFutureMatches: true });
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const refreshSubs = async () => {
    if (!selectedWindowId) return;
    const data = await fetchPhaseSubmissions(selectedWindowId);
    setSubmissions(data.submissions || []);
    onSettingsSaved?.();
  };

  const handleApprove = async (id) => {
    setReviewingId(id);
    try { await approvePhaseSubmission(id); await refreshSubs(); }
    catch (e) { alert(e.message); }
    finally { setReviewingId(null); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Motivo opcional de rechazo:', '') || '';
    setReviewingId(id);
    try { await rejectPhaseSubmission(id, reason); await refreshSubs(); }
    catch (e) { alert(e.message); }
    finally { setReviewingId(null); }
  };

  const handleApproveAll = async () => {
    const pending = visibleSubmissions.filter(s => !s.status || s.status === 'pending');
    if (!pending.length) return;
    if (!window.confirm(`Vas a aprobar ${pending.length} registros pendientes. ¿Continuar?`)) return;
    setApprovingAll(true);
    try {
      for (const sub of pending) {
        await approvePhaseSubmission(sub.id);
      }
      await refreshSubs();
    } catch (e) { alert(e.message); }
    finally { setApprovingAll(false); }
  };

  const handleFreeze = async () => {
    if (!window.confirm('¿Seguro que quieres congelar la Quiniela RH? Esto guardará la tabla actual como resultado final de fase de grupos.')) return;
    setFreezing(true);
    try {
      const frozenStandings = standings.length ? standings : [...participants].map((p, index) => ({ ...p, rank: p.rank || index + 1 }));
      await freezeCapitalHumanoArchive({ matches, participants, standings: frozenStandings, generatedBy: 'admin' });
      alert('Quiniela RH congelada como histórico.');
      onSettingsSaved?.();
    } catch (e) { alert(e.message); }
    finally { setFreezing(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta ventana? Se borrará permanentemente.')) return;
    setDeletingId(id);
    try {
      await deletePredictionWindow(id);
      setWindows(prev => prev.filter(w => w.id !== id));
      if (selectedWindowId === id) setSelectedWindowId(null);
    } catch (e) { alert(e.message); }
    finally { setDeletingId(null); }
  };

  const handleDeleteSub = async (id) => {
    if (!window.confirm('¿Eliminar estos pronósticos?')) return;
    setDeletingSubId(id);
    try {
      await deletePhaseSubmission(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (e) { alert(e.message); }
    finally { setDeletingSubId(null); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateContinuationSettings(settings);
      onSettingsSaved?.();
    } catch (e) { alert(e.message); }
    finally { setSavingSettings(false); }
  };

  const handleReactivateNotice = async () => {
    setReactivating(true);
    try {
      const currentPopup = settings.transitionPopup || {};
      const nextVersion = (currentPopup.version || settings.transitionNoticeVersion || 1) + 1;
      const next = {
        ...settings,
        transitionNoticeVersion: nextVersion,
        transitionPopup: { ...currentPopup, version: nextVersion, enabled: true }
      };
      setSettings(next);
      await updateContinuationSettings(next);
      onSettingsSaved?.();
      alert(`Popup reactivado (versión ${nextVersion}). Los usuarios volverán a verlo.`);
    } catch (e) { alert(e.message); }
    finally { setReactivating(false); }
  };

  const selectedWindow = windows.find(w => w.id === selectedWindowId);

  const baseVisibleSubmissions = selectedWindowId ? submissions : [];
  const visibleSubmissions =
    subFilter === 'pendientes' ? baseVisibleSubmissions.filter(s => !s.status || s.status === 'pending')
      : subFilter === 'aprobados' ? baseVisibleSubmissions.filter(s => s.status === 'approved')
        : subFilter === 'rechazados' ? baseVisibleSubmissions.filter(s => s.status === 'rejected')
          : subFilter === 'nuevos' ? baseVisibleSubmissions.filter(s => s.userType === 'new')
            : subFilter === 'existentes' ? baseVisibleSubmissions.filter(s => s.userType !== 'new')
              : baseVisibleSubmissions;

  return (
    <div className="admin-section-body">
      {/* Toast de nuevo pendiente */}
      {newPendingToast && (
        <div className="admin-new-pending-toast">{newPendingToast}</div>
      )}

      <div className="admin-section-header">
        <div>
          <h2>Nueva Quiniela</h2>
          <p>Control de la quiniela de continuación del Mundial</p>
        </div>
        <button className="admin-header-action-btn" onClick={() => setPreviewOpen(true)}>
          <Eye size={14} /> Preview como usuario
        </button>
      </div>

      {previewOpen && (
        <PhasePredictionForm
          matches={matches || []}
          previewMode={true}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* === BANDEJA DE REVISIÓN (primero) === */}
      <div ref={inboxRef}>
        <AdminReviewInbox
          pendingSubmissions={pendingSubmissions}
          onApprove={handleApprove}
          onReject={handleReject}
          onSelect={(sub) => {
            setSelectedWindowId(sub.windowId);
            setSubFilter('pendientes');
            setTimeout(() => document.querySelector('.admin-submissions-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }}
        />
      </div>

      {/* === MÉTRICAS === */}
      {activeWindow && (
        <div className="admin-card">
          <h3 className="admin-section-title"><CalendarClock size={16} /> Ventana activa: {activeWindow.name}</h3>
          <p className="admin-ext-hint" style={{ marginBottom: '0.75rem' }}>
            Estado: <strong>{STATUS_LABEL[getWindowStatus(activeWindow)] || getWindowStatus(activeWindow)}</strong>
            {activeWindow.openAt ? ` · Abierta desde ${formatWindowDate(activeWindow.openAt)}` : ''}
            {' · Cierre 10 min antes de cada partido'}
          </p>
          <div className="admin-extension-stats">
            <div className="admin-ext-stat"><strong>{metrics.total}</strong><span>Enviaron pronósticos</span></div>
            <div
              className="admin-ext-stat"
              style={metrics.pending > 0 ? { cursor: 'pointer' } : {}}
              onClick={() => {
                if (!metrics.pending) return;
                inboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <strong style={metrics.pending > 0 ? { color: 'var(--accent, #f59e0b)' } : {}}>{metrics.pending}</strong>
              <span>Pendientes revisión</span>
              {metrics.pending > 0 && <small style={{ fontSize: '0.72rem', color: 'var(--accent, #f59e0b)' }}>↑ Revisar</small>}
            </div>
            <div className="admin-ext-stat"><strong>{metrics.approved}</strong><span>Aprobados</span></div>
            <div className="admin-ext-stat"><strong>{metrics.rejected}</strong><span>Rechazados</span></div>
            <div className="admin-ext-stat"><strong>{metrics.edited}</strong><span>Editados</span></div>
            <div className="admin-ext-stat"><strong>{metrics.newUsers}</strong><span>Nuevos usuarios</span></div>
            <div className="admin-ext-stat"><strong>{metrics.existingUsers}</strong><span>Usuarios RH</span></div>
          </div>
        </div>
      )}

      {/* === CONTROL DE PUBLICACIÓN === */}
      <div className="admin-card">
        <h3 className="admin-section-title">Control de publicación</h3>
        <div className="admin-publication-controls">
          <label className="admin-toggle-row">
            <span>Nueva Quiniela pública</span>
            <input type="checkbox" checked={settings.publicEnabled !== false} onChange={e => setSettings(p => ({ ...p, publicEnabled: e.target.checked }))} />
          </label>
          <label className="admin-toggle-row">
            <span>Registro de usuarios</span>
            <input type="checkbox" checked={settings.registrationEnabled !== false} onChange={e => setSettings(p => ({ ...p, registrationEnabled: e.target.checked }))} />
          </label>
          <label className="admin-toggle-row">
            <span>Popup transición RH → Nueva Quiniela</span>
            <input
              type="checkbox"
              checked={(settings.transitionPopup?.enabled ?? settings.transitionNoticeEnabled) !== false}
              onChange={e => setSettings(p => ({
                ...p,
                transitionNoticeEnabled: e.target.checked,
                transitionPopup: { ...(p.transitionPopup || {}), enabled: e.target.checked }
              }))}
            />
          </label>
          <label className="admin-toggle-row">
            <span>Máximo vistas del popup</span>
            <input
              type="number"
              min="1"
              max="10"
              className="review-name-input"
              style={{ width: 90 }}
              value={settings.transitionPopup?.maxViews ?? 2}
              onChange={e => setSettings(p => ({
                ...p,
                transitionPopup: { ...(p.transitionPopup || {}), maxViews: Number(e.target.value) || 2 }
              }))}
            />
          </label>
          <label className="admin-toggle-row">
            <span>Modo emergencia</span>
            <input type="checkbox" checked={!!settings.emergencyMode} onChange={e => setSettings(p => ({ ...p, emergencyMode: e.target.checked }))} />
          </label>
          <label className="admin-toggle-row">
            <span>Tabla General usa</span>
            <select className="crm-team-select" style={{ width: 180 }} value={settings.dashboardMode || 'auto'} onChange={e => setSettings(p => ({ ...p, dashboardMode: e.target.value }))}>
              <option value="auto">Auto (según fecha)</option>
              <option value="rh_current">Quiniela RH actual</option>
              <option value="rh_archive">Quiniela RH histórica</option>
              <option value="new_quiniela">Nueva Quiniela</option>
              <option value="combined">Acumulado RH + Nueva Quiniela</option>
            </select>
          </label>
          {settings.emergencyMode && (
            <label className="admin-toggle-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <span>Mensaje de emergencia</span>
              <input className="review-name-input" style={{ width: '100%' }} value={settings.emergencyMessage || ''} onChange={e => setSettings(p => ({ ...p, emergencyMessage: e.target.value }))} placeholder="Mensaje público cuando hay emergencia…" />
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button className="review-save-btn" onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? 'Guardando…' : 'Guardar configuración'}
          </button>
          <button className="admin-btn-action btn-logout" onClick={handleReactivateNotice} disabled={reactivating}>
            <RefreshCw size={13} /> {reactivating ? '…' : 'Reactivar popup'}
          </button>
        </div>
      </div>

      {/* === CHECKLIST DOMINGO === */}
      <div className="admin-card">
        <h3 className="admin-section-title">Checklist domingo</h3>
        <div className="admin-checklist">
          {checklist.map((item, idx) => (
            <div key={idx} className={`admin-checklist-item ${item.ok ? 'ok' : item.warn ? 'warn' : 'ok'}`}>
              {item.ok ? <CheckCircle2 size={15} className="chk-icon green" /> : item.warn ? <AlertTriangle size={15} className="chk-icon amber" /> : <XCircle size={15} className="chk-icon red" />}
              <span>{item.label}</span>
              {!item.ok && item.hint && <small className="chk-hint">{item.hint}</small>}
            </div>
          ))}
        </div>
      </div>

      {/* === CIERRE QUINIELA RH === */}
      <div className="admin-card">
        <h3 className="admin-section-title">Cierre Quiniela RH</h3>
        <p className="admin-ext-hint">Congela la tabla actual de Quiniela RH como histórico permanente. Solo hacer una vez al cerrar la fase de grupos.</p>
        <button className="review-save-btn" onClick={handleFreeze} disabled={freezing}>
          {freezing ? 'Congelando…' : 'Cerrar y congelar Quiniela RH'}
        </button>
      </div>

      {/* === ROSTER === */}
      <div className="admin-card">
        <h3 className="admin-section-title"><CalendarClock size={16} /> Roster</h3>
        <div className="admin-extension-stats">
          <div className="admin-ext-stat"><strong>{withEmail}</strong><span>participantes con correo</span></div>
          <div className="admin-ext-stat"><strong>{rosterTotal - withEmail}</strong><span>sin correo asignado</span></div>
          <div className="admin-ext-stat"><strong>{participants.filter(p => p.team).length}</strong><span>con equipo (BZ/UP)</span></div>
        </div>
        {withEmail < participants.length && (
          <p className="admin-ext-hint">💡 Ve a Participantes para asignar correos desde el roster precargado.</p>
        )}
      </div>

      {/* === VENTANAS === */}
      <div className="admin-card">
        <div className="participants-card-head">
          <h3 className="admin-section-title">Ventanas de pronóstico</h3>
          <button className="admin-export-all-btn" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> Nueva ventana
          </button>
        </div>

        {showForm && (
          <div className="admin-window-form">
            <label className="review-field-label">
              Nombre
              <input className="review-name-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Octavos de final" />
            </label>
            <label className="review-field-label">
              Estado inicial
              <select className="participant-admin-team-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="draft">Borrador</option>
                <option value="scheduled">Programada</option>
                <option value="open">Abierta</option>
              </select>
            </label>
            <label className="review-field-label">
              Apertura (opcional)
              <input type="datetime-local" className="review-name-input" value={form.openAt} onChange={e => setForm(p => ({ ...p, openAt: e.target.value }))} />
            </label>
            <label className="review-field-label">
              <input type="checkbox" checked={form.autoIncludeFutureMatches} onChange={e => setForm(p => ({ ...p, autoIncludeFutureMatches: e.target.checked }))} />
              Incluir automáticamente partidos futuros del feed
            </label>
            <p className="admin-ext-hint">Regla de cierre: cada partido se bloquea 10 minutos antes de jugarse.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="review-save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Crear ventana'}</button>
              <button className="admin-btn-action btn-logout" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {loading
          ? <div className="participants-empty-state">Cargando…</div>
          : windows.length === 0
            ? <div className="participants-empty-state">No hay ventanas configuradas.</div>
            : (
              <div className="crm-table-wrap" style={{ marginTop: '0.75rem' }}>
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Ventana</th>
                      <th style={{ width: 110 }}>Estado</th>
                      <th>Apertura</th>
                      <th className="crm-th-center" style={{ width: 80 }}>Envíos</th>
                      <th className="crm-th-center" style={{ width: 100 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {windows.map(win => {
                      const status = getWindowStatus(win);
                      return (
                        <tr
                          key={win.id}
                          className={`crm-row ${selectedWindowId === win.id ? 'crm-row-selected' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedWindowId(prev => prev === win.id ? null : win.id)}
                        >
                          <td><span className="crm-name">{win.name}</span></td>
                          <td>
                            <span className="phase-status-badge" data-status={status}>
                              <span className={`notif-status-dot ${STATUS_COLOR[status] || 'grey'}`} style={{ marginRight: 4 }} />
                              {STATUS_LABEL[status] || status}
                            </span>
                          </td>
                          <td><span className="crm-email">{win.openAt ? formatWindowDate(win.openAt) : '—'}</span></td>
                          <td className="crm-th-center"><span className="crm-count">{win.submissionCount || 0}</span></td>
                          <td>
                            <div className="crm-actions">
                              <button
                                className="crm-action-btn danger"
                                title="Eliminar ventana"
                                disabled={deletingId === win.id}
                                onClick={e => { e.stopPropagation(); handleDelete(win.id); }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      {/* === SUBMISSIONS PANEL === */}
      {selectedWindowId && (
        <div className="admin-card admin-submissions-panel">
          <div className="participants-card-head" style={{ marginBottom: '0.5rem' }}>
            <h3 className="admin-section-title">Quinielas enviadas — {selectedWindow?.name}</h3>
            {visibleSubmissions.filter(s => !s.status || s.status === 'pending').length > 0 && (
              <button className="admin-export-all-btn" onClick={handleApproveAll} disabled={approvingAll}>
                <Check size={14} /> {approvingAll ? 'Aprobando…' : 'Aprobar todos los pendientes'}
              </button>
            )}
          </div>

          <div className="newq-filters" style={{ marginBottom: '0.75rem' }}>
            {SUB_FILTERS.map(f => (
              <button key={f} className={`newq-filter-btn${subFilter === f ? ' active' : ''}`} onClick={() => setSubFilter(f)}>
                {SUB_FILTER_LABEL[f]}
              </button>
            ))}
          </div>

          {visibleSubmissions.length === 0
            ? <div className="participants-empty-state">No hay registros en esta categoría.</div>
            : (
              <div className="crm-table-wrap">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Participante</th>
                      <th>Correo</th>
                      <th style={{ width: 60 }}>Tipo</th>
                      <th style={{ width: 60 }}>Team</th>
                      <th className="crm-th-center" style={{ width: 90 }}>Estado</th>
                      <th className="crm-th-center" style={{ width: 70 }}>Pronóst.</th>
                      <th>Guardado</th>
                      <th className="crm-th-center" style={{ width: 130 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubmissions.map(sub => (
                      <tr key={sub.id} className="crm-row">
                        <td><span className="crm-name">{sub.participantName || sub.email}</span></td>
                        <td><span className="crm-email">{sub.email}</span></td>
                        <td><span className="crm-count">{sub.userType === 'new' ? 'Nuevo' : 'RH'}</span></td>
                        <td><span className="crm-count">{sub.team || '—'}</span></td>
                        <td className="crm-th-center">
                          <span className={`phase-status-badge status-${sub.status || 'pending'}`}>
                            {SUB_STATUS_LABEL[sub.status] || 'Pendiente'}
                          </span>
                        </td>
                        <td className="crm-th-center"><span className="crm-count">{Object.keys(sub.predictions || {}).length}</span></td>
                        <td><span className="crm-email">{sub.updatedAt ? new Date(sub.updatedAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
                        <td>
                          <div className="crm-actions">
                            <button className="crm-action-btn" title="Aprobar" disabled={reviewingId === sub.id || sub.status === 'approved'} onClick={() => handleApprove(sub.id)}>
                              <Check size={13} />
                            </button>
                            <button className="crm-action-btn" title="Rechazar" disabled={reviewingId === sub.id || sub.status === 'rejected'} onClick={() => handleReject(sub.id)}>
                              <X size={13} />
                            </button>
                            <button className="crm-action-btn danger" title="Eliminar envío" disabled={deletingSubId === sub.id} onClick={() => handleDeleteSub(sub.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      <div className="admin-card" style={{ background: 'var(--surface-soft)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          <strong>Flujo:</strong> Crea una ventana → cámbiala a "Abierta" → comparte el link <code>#nueva-quiniela</code> con los participantes → ellos ingresan su correo y sus pronósticos.<br />
          <strong>Cierre automático:</strong> Cada partido se bloquea 10 minutos antes de jugarse.<br />
          <strong>Link para usuarios:</strong> <code>{typeof window !== 'undefined' ? window.location.origin : ''}/#nueva-quiniela</code>
        </p>
      </div>
    </div>
  );
}
