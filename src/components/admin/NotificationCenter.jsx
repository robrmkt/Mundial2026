import { useEffect, useState } from 'react';
import { Bell, KeyRound, Save } from 'lucide-react';
import NotificationTemplateCard from './NotificationTemplateCard';
import { fetchNotificationSettings, saveNotificationSettings, fetchNotificationLog, sendTestNotification } from '../../services/notifications';

const MODE_LABELS = { off: 'Apagado', test: 'Prueba', production: 'Producción' };
const MODE_COLORS = { off: 'grey', test: 'amber', production: 'green' };

function StatusDot({ mode, enabled }) {
  const color = !enabled ? 'grey' : MODE_COLORS[mode] || 'grey';
  const label = !enabled ? 'Notificaciones apagadas' : `Modo ${MODE_LABELS[mode] || mode} activo`;
  return <span className="notif-global-status"><span className={`notif-status-dot ${color}`} />{label}</span>;
}

export default function NotificationCenter({ isSuper, session }) {
  const [settings, setSettings] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(null);
  const [testRecipientInput, setTestRecipientInput] = useState('');
  const [actionToken, setActionToken] = useState(() => sessionStorage.getItem('adminActionToken') || '');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    Promise.all([fetchNotificationSettings(), fetchNotificationLog()])
      .then(([s, l]) => { setSettings(s); setTestRecipientInput(s.testRecipient || ''); setLog(l.log || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveToken = (val) => { setActionToken(val); sessionStorage.setItem('adminActionToken', val); };

  const handleSave = async (patch) => {
    setSaving(true); setStatusMsg('');
    try {
      const updated = await saveNotificationSettings({ ...settings, ...patch, testRecipient: testRecipientInput }, actionToken);
      setSettings(updated);
      setStatusMsg('Guardado correctamente.');
    } catch (e) {
      setStatusMsg(e.message || 'Error al guardar. Verifica el token de acción.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTemplate = (key, enabled) => {
    handleSave({ templates: { ...settings.templates, [key]: { ...settings.templates[key], enabled } } });
  };

  const handleSendTest = async (templateKey) => {
    setSendingTest(templateKey); setStatusMsg('');
    try {
      const result = await sendTestNotification({
        templateKey,
        testRecipient: testRecipientInput || settings?.testRecipient,
        sampleData: { participantName: session?.displayName || 'Roberto', matchLabel: 'México vs Chequia', score: '2-1', points: 3 },
        actionToken
      });
      setStatusMsg(result.logEntry?.status === 'sent' ? '✅ Prueba enviada correctamente.' : `⚠️ ${result.logEntry?.error || 'Sin proveedor configurado.'}`);
      setLog(prev => [result.logEntry, ...prev].slice(0, 50));
    } catch (e) {
      setStatusMsg(e.message || 'Error en prueba');
    } finally {
      setSendingTest(null);
    }
  };

  if (loading) return <div className="admin-section-body"><div className="participants-empty-state">Cargando…</div></div>;

  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <h2>Notificaciones por correo</h2>
        <StatusDot mode={settings?.mode} enabled={settings?.enabled} />
      </div>

      {statusMsg && <div className="excel-upload-success-badge" style={{ marginBottom: '0.75rem' }}>{statusMsg}</div>}

      {/* Token de acción */}
      {isSuper && (
        <div className="admin-card" style={{ marginBottom: '0.75rem' }}>
          <h3 className="admin-section-title" style={{ marginBottom: '0.5rem' }}><KeyRound size={15} /> Token de acción admin</h3>
          <p className="openai-key-hint">Requerido para guardar configuración o enviar pruebas. Se guarda solo en esta pestaña.</p>
          <div className="openai-key-controls" style={{ marginTop: '0.4rem' }}>
            <input type={tokenVisible ? 'text' : 'password'} className="review-name-input" placeholder="ADMIN_ACTION_TOKEN de Railway" value={actionToken} onChange={e => saveToken(e.target.value)} />
            <button type="button" className="openai-key-toggle" onClick={() => setTokenVisible(v => !v)}>{tokenVisible ? 'Ocultar' : 'Ver'}</button>
          </div>
        </div>
      )}

      {/* Estado global */}
      <div className="admin-card">
        <h3 className="admin-section-title"><Bell size={16} /> Estado global</h3>
        <div className="notif-global-row">
          <div className="notif-global-toggle">
            <label className="notif-switch">
              <input type="checkbox" checked={settings?.enabled || false} onChange={e => handleSave({ enabled: e.target.checked })} />
              <span className="notif-switch-track" />
            </label>
            <span>{settings?.enabled ? 'Notificaciones activas' : 'Notificaciones desactivadas'}</span>
          </div>
          <div className="notif-mode-selector">
            {['off', 'test', 'production'].map(m => (
              <button
                key={m}
                className={`notif-mode-btn ${settings?.mode === m ? 'active' : ''} mode-${m}`}
                onClick={() => {
                  if (m === 'production' && !window.confirm('¿Activar envíos reales a todos los participantes?')) return;
                  handleSave({ mode: m });
                }}
              >{MODE_LABELS[m]}</button>
            ))}
          </div>
        </div>

        <div className="notif-test-recipient-row">
          <label className="review-field-label" style={{ marginBottom: 0 }}>
            Correo de prueba
            <input className="review-name-input" type="email" value={testRecipientInput} onChange={e => setTestRecipientInput(e.target.value)} placeholder="correo@empresa.com" />
          </label>
          <button className="review-save-btn" onClick={() => handleSave({})} disabled={saving}><Save size={13} /> {saving ? '…' : 'Guardar'}</button>
        </div>
      </div>

      {/* Templates */}
      <div className="admin-card">
        <h3 className="admin-section-title">Plantillas</h3>
        <div className="notif-templates-list">
          {settings?.templates && Object.entries(settings.templates).map(([key, tpl]) => (
            <NotificationTemplateCard
              key={key}
              templateKey={key}
              template={tpl}
              onToggle={handleToggleTemplate}
              onSendTest={handleSendTest}
              sending={sendingTest === key}
            />
          ))}
        </div>
      </div>

      {/* Log */}
      <div className="admin-card">
        <h3 className="admin-section-title">Historial de envíos</h3>
        {log.length === 0 ? (
          <div className="participants-empty-state">Sin registros todavía.</div>
        ) : (
          <div className="notif-log-table">
            <div className="notif-log-header">
              <span>Hora</span><span>Tipo</span><span>Para</span><span>Modo</span><span>Estado</span>
            </div>
            {log.slice(0, 30).map(entry => (
              <div key={entry.id} className="notif-log-row">
                <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                <span>{entry.type}</span>
                <span className="notif-log-to">{entry.to || '—'}</span>
                <span>{entry.mode}</span>
                <span className={`notif-log-status ${entry.status}`}>{entry.status}{entry.error ? `: ${entry.error}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
