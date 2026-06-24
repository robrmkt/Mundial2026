import { Send } from 'lucide-react';

const AUDIENCE_LABEL = {
  participant: 'Participante individual',
  allParticipants: 'Todos los participantes',
  pendingParticipants: 'Participantes pendientes'
};

export default function NotificationTemplateCard({ templateKey, template, onToggle, onSendTest, sending }) {
  return (
    <div className={`notif-template-card ${template.enabled ? 'enabled' : 'disabled'}`}>
      <div className="notif-template-head">
        <button
          className={`notif-template-toggle ${template.enabled ? 'on' : 'off'}`}
          onClick={() => onToggle(templateKey, !template.enabled)}
          title={template.enabled ? 'Desactivar' : 'Activar'}
        >
          {template.enabled ? 'Activo' : 'Apagado'}
        </button>
        <span className="notif-template-label">{template.label}</span>
      </div>
      <p className="notif-template-trigger">{template.trigger}</p>
      <div className="notif-template-meta">
        <span className="notif-template-subject">{template.subject}</span>
        <span className="notif-template-audience">{AUDIENCE_LABEL[template.audience] || template.audience}</span>
      </div>
      <div className="notif-template-actions">
        <button
          className="notif-test-btn"
          onClick={() => onSendTest(templateKey)}
          disabled={sending}
        >
          <Send size={12} /> {sending ? 'Enviando…' : 'Enviar prueba'}
        </button>
      </div>
    </div>
  );
}
