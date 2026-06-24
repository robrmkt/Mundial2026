import { RefreshCw, Sparkles, Square, Wifi } from 'lucide-react';

export default function AdminOverview({ visitStats, syncState, onSyncNow, simActive, setSimActive, handleReset, isSuper }) {
  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <h2>Resumen</h2>
        <p>Estado general de la plataforma</p>
      </div>

      <div className="admin-overview-actions">
        <button className="admin-btn-action btn-sync" onClick={onSyncNow}>
          <Wifi size={15} /> Sincronizar resultados
        </button>
        {isSuper && (!simActive ? (
          <button className="admin-btn-action btn-sim-play" onClick={() => setSimActive(true)}>
            <Sparkles size={15} /> Modo demo
          </button>
        ) : (
          <button className="admin-btn-action btn-sim-pause" onClick={() => setSimActive(false)}>
            <Square size={15} /> Pausar demo
          </button>
        ))}
        {isSuper && (
          <button className="admin-btn-action btn-sim-reset" onClick={handleReset}>
            <RefreshCw size={15} /> Reiniciar todo
          </button>
        )}
      </div>

      {syncState?.lastSync && (
        <p className="admin-sync-note">
          Última sincronización: {syncState.lastSync.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          {syncState.status === 'error' ? ' · con errores, reintentando' : ''}
        </p>
      )}

      {visitStats && (
        <div className="admin-card admin-visit-card" style={{ marginTop: '1.2rem' }}>
          <h3 className="admin-section-title" style={{ marginBottom: '0.75rem' }}>Actividad</h3>
          <div className="admin-visit-grid">
            <div><strong>{visitStats.totalVisits.toLocaleString('es-MX')}</strong><span>visitas estimadas</span></div>
            <div><strong>{visitStats.activeClients}</strong><span>activos ahora</span></div>
            <div><strong>{visitStats.trackedVisits.toLocaleString('es-MX')}</strong><span>reales desde contador</span></div>
            <div><strong>{visitStats.uniqueClients.toLocaleString('es-MX')}</strong><span>navegadores únicos</span></div>
          </div>
          <p className="admin-visit-note">
            {visitStats.estimatedFormula || 'Base estimada configurada en servidor'}. Desde hoy se suma el conteo real anónimo.
          </p>
        </div>
      )}
    </div>
  );
}
