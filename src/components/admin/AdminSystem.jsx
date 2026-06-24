export default function AdminSystem({ isSuper }) {
  const hasResend = true; // detectado en runtime, no en frontend
  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <h2>Sistema</h2>
        <p>Configuración técnica y estado del backend</p>
      </div>

      <div className="admin-card">
        <h3 className="admin-section-title">Variables de entorno (Railway)</h3>
        <div className="notif-log-table">
          <div className="notif-log-header"><span>Variable</span><span>Descripción</span><span>Estado</span></div>
          {[
            { key: 'RESEND_API_KEY', desc: 'API key del proveedor de correo Resend', required: true },
            { key: 'MAIL_FROM', desc: 'Remitente: Nombre <correo@dominio.com>', required: true },
            { key: 'ADMIN_ACTION_TOKEN', desc: 'Token para acciones admin sensibles (notificaciones)', required: true },
            { key: 'VISIT_BASELINE', desc: 'Número base de visitas estimadas', required: false },
            { key: 'DATA_DIR', desc: 'Ruta del volumen persistente (/data en Railway)', required: false },
          ].map(v => (
            <div key={v.key} className="notif-log-row">
              <span><code>{v.key}</code></span>
              <span>{v.desc}</span>
              <span className={`notif-log-status ${v.required ? 'skipped' : 'sent'}`}>{v.required ? 'Requerida' : 'Opcional'}</span>
            </div>
          ))}
        </div>
        <p className="openai-key-hint" style={{ marginTop: '0.75rem' }}>
          Configura estas variables en Railway → tu proyecto → Variables → Add Variable. El servidor las lee en tiempo de ejecución; no aparecen en el frontend.
        </p>
      </div>

      {isSuper && (
        <div className="admin-card" style={{ borderColor: 'var(--red-light, #fecaca)' }}>
          <h3 className="admin-section-title" style={{ color: 'var(--red, #dc2626)' }}>Zona de peligro</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Las acciones de reinicio solo están disponibles en la sección <strong>Resumen</strong> para super administradores.
          </p>
        </div>
      )}
    </div>
  );
}
