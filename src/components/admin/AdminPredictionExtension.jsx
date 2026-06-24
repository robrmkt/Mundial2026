import { useState, useEffect } from 'react';
import { CalendarClock, Eye, Plus, Trash2 } from 'lucide-react';
import { fetchPredictionWindows, savePredictionWindow, deletePredictionWindow, getWindowStatus, formatWindowDate, fetchPhaseSubmissions, deletePhaseSubmission } from '../../services/predictionWindows';
import { PARTICIPANT_EMAIL_ROSTER } from '../../services/participantEmails';
import PhasePredictionForm from '../PhasePredictionForm';

const STATUS_LABEL = { draft: 'Borrador', scheduled: 'Programada', open: 'Abierta', closed: 'Cerrada' };
const STATUS_COLOR = { draft: 'grey', scheduled: 'amber', open: 'green', closed: 'grey' };

export default function AdminPredictionExtension({ participants, matches }) {
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: 'Siguiente fase', status: 'draft', openAt: '', matchIds: [], closeRule: '24h_before_match' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedWindowId, setSelectedWindowId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [deletingSubId, setDeletingSubId] = useState(null);

  useEffect(() => {
    fetchPredictionWindows()
      .then(d => setWindows(d.windows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedWindowId) { setSubmissions([]); return; }
    setLoadingSubs(true);
    fetchPhaseSubmissions(selectedWindowId)
      .then(d => setSubmissions(d.submissions || []))
      .catch(() => {})
      .finally(() => setLoadingSubs(false));
  }, [selectedWindowId]);

  const withEmail = participants.filter(p => p.email).length;
  const rosterTotal = PARTICIPANT_EMAIL_ROSTER.length;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = await savePredictionWindow(form);
      setWindows(prev => [...prev, result.window]);
      setShowForm(false);
      setForm({ name: 'Siguiente fase', status: 'draft', openAt: '', matchIds: [], closeRule: '24h_before_match' });
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta ventana? Se borrará permanentemente.')) return;
    setDeletingId(id);
    try {
      await deletePredictionWindow(id);
      setWindows(prev => prev.filter(w => w.id !== id));
      if (selectedWindowId === id) setSelectedWindowId(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSub = async (id) => {
    if (!window.confirm('¿Eliminar estos pronósticos?')) return;
    setDeletingSubId(id);
    try {
      await deletePhaseSubmission(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingSubId(null);
    }
  };

  const selectedWindow = windows.find(w => w.id === selectedWindowId);

  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <div>
          <h2>Extensión de quiniela</h2>
          <p>Ventanas de pronóstico para nuevas fases del Mundial</p>
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

      {/* Email status */}
      <div className="admin-card">
        <h3 className="admin-section-title"><CalendarClock size={16} /> Roster</h3>
        <div className="admin-extension-stats">
          <div className="admin-ext-stat">
            <strong>{withEmail}</strong>
            <span>participantes con correo</span>
          </div>
          <div className="admin-ext-stat">
            <strong>{rosterTotal - withEmail}</strong>
            <span>sin correo asignado</span>
          </div>
          <div className="admin-ext-stat">
            <strong>{participants.filter(p => p.team).length}</strong>
            <span>con equipo (BZ/UP)</span>
          </div>
        </div>
        {withEmail < participants.length && (
          <p className="admin-ext-hint">💡 Ve a Participantes para asignar correos desde el roster precargado.</p>
        )}
      </div>

      {/* Windows list */}
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
            <p className="admin-ext-hint">Regla de cierre: cada partido se bloquea 24 h antes de jugarse.</p>
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

      {/* Submissions panel */}
      {selectedWindowId && (
        <div className="admin-card">
          <h3 className="admin-section-title">
            Quinielas enviadas — {selectedWindow?.name}
          </h3>
          {loadingSubs
            ? <div className="participants-empty-state">Cargando…</div>
            : submissions.length === 0
              ? <div className="participants-empty-state">Nadie ha enviado pronósticos para esta ventana todavía.</div>
              : (
                <div className="crm-table-wrap" style={{ marginTop: '0.75rem' }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Participante</th>
                        <th>Correo</th>
                        <th className="crm-th-center" style={{ width: 80 }}>Pronóst.</th>
                        <th>Guardado</th>
                        <th className="crm-th-center" style={{ width: 80 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map(sub => (
                        <tr key={sub.id} className="crm-row">
                          <td><span className="crm-name">{sub.participantName || sub.email}</span></td>
                          <td><span className="crm-email">{sub.email}</span></td>
                          <td className="crm-th-center"><span className="crm-count">{Object.keys(sub.predictions || {}).length}</span></td>
                          <td><span className="crm-email">{sub.updatedAt ? new Date(sub.updatedAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
                          <td>
                            <div className="crm-actions">
                              <button
                                className="crm-action-btn danger"
                                title="Eliminar envío"
                                disabled={deletingSubId === sub.id}
                                onClick={() => handleDeleteSub(sub.id)}
                              >
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
          <strong>Flujo:</strong> Crea una ventana → cámbiala a "Abierta" → comparte el link <code>/fase2</code> con los participantes → ellos ingresan su correo y sus pronósticos.<br />
          <strong>Cierre automático:</strong> Cada partido se bloquea 24 h antes de jugarse.<br />
          <strong>Link para usuarios:</strong> <code>{typeof window !== 'undefined' ? window.location.origin : ''}/fase2</code>
        </p>
      </div>
    </div>
  );
}
