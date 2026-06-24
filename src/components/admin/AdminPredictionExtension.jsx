import { useState, useEffect } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { fetchPredictionWindows, savePredictionWindow, getWindowStatus, formatWindowDate } from '../../services/predictionWindows';
import { PARTICIPANT_EMAIL_ROSTER } from '../../services/participantEmails';

const STATUS_LABEL = { draft: 'Borrador', scheduled: 'Programada', open: 'Abierta', closed: 'Cerrada' };
const STATUS_COLOR = { draft: 'grey', scheduled: 'amber', open: 'green', closed: 'grey' };

export default function AdminPredictionExtension({ participants }) {
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: 'Siguiente fase', status: 'draft', openAt: '', matchIds: [], closeRule: '24h_before_match' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPredictionWindows()
      .then(d => setWindows(d.windows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <h2>Extensión de quiniela</h2>
        <p>Configura ventanas de pronóstico para nuevas fases del Mundial</p>
      </div>

      {/* Email status */}
      <div className="admin-card">
        <h3 className="admin-section-title"><CalendarClock size={16} /> Estado del roster</h3>
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
              <input className="review-name-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Siguiente fase" />
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
            <p className="admin-ext-hint">Regla de cierre: cada partido se bloquea 24 horas antes de jugarse.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="review-save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Crear ventana'}</button>
              <button className="admin-btn-action btn-logout" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {loading ? <div className="participants-empty-state">Cargando…</div>
          : windows.length === 0
            ? <div className="participants-empty-state">No hay ventanas configuradas todavía.</div>
            : windows.map(win => {
                const status = getWindowStatus(win);
                return (
                  <div key={win.id} className="document-history-item">
                    <div>
                      <strong>{win.name}</strong>
                      <span>
                        <span className={`notif-status-dot ${STATUS_COLOR[status] || 'grey'}`} />
                        {STATUS_LABEL[status] || status}
                        {win.openAt ? ` · Apertura: ${formatWindowDate(win.openAt)}` : ''}
                        {win.matchIds?.length ? ` · ${win.matchIds.length} partidos` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
      </div>

      {/* Rules reminder */}
      <div className="admin-card" style={{ background: 'var(--surface-soft)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          <strong>Regla de cierre:</strong> Cada partido se bloquea 1 día antes de jugarse.<br />
          <strong>Acceso público:</strong> Deshabilitado en esta etapa — solo el admin puede interactuar.<br />
          <strong>Pronósticos nuevos:</strong> Se guardan en el mismo objeto <code>predictions</code>, sin alterar la lógica de puntos.
        </p>
      </div>
    </div>
  );
}
