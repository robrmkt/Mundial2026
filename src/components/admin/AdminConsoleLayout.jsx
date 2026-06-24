import { Activity, Bell, CalendarClock, LogOut, Settings, ShieldCheck, Upload, Users2 } from 'lucide-react';

export const ADMIN_SECTIONS = [
  { key: 'overview',      label: 'Resumen',        icon: Activity },
  { key: 'quinielas',     label: 'Quinielas',       icon: Upload },
  { key: 'participants',  label: 'Participantes',   icon: Users2 },
  { key: 'extension',     label: 'Extensión',       icon: CalendarClock },
  { key: 'notifications', label: 'Notificaciones',  icon: Bell },
  { key: 'system',        label: 'Sistema',         icon: Settings },
];

export default function AdminConsoleLayout({ activeSection, onSelectSection, session, onLogout, children }) {
  const isSuper = session?.role === 'superadmin';

  return (
    <div className="admin-console">
      <aside className="admin-console-sidebar">
        <div className="admin-console-sidebar-head">
          <span className="admin-console-logo">⚙️</span>
          <div>
            <strong className="admin-console-title">Admin</strong>
            <span className="admin-console-role">{isSuper ? 'Super Admin' : 'Admin'}</span>
          </div>
        </div>

        <nav className="admin-console-nav">
          {ADMIN_SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`admin-console-nav-btn${activeSection === key ? ' active' : ''}`}
              onClick={() => onSelectSection(key)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-console-sidebar-foot">
          <span className="admin-console-session">
            <ShieldCheck size={13} />
            {session?.displayName || 'Sesión'}
          </span>
          <button className="admin-console-logout-btn" onClick={onLogout}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </aside>

      <main className="admin-console-main">
        {children}
      </main>
    </div>
  );
}
