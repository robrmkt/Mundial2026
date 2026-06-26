import { Camera, Download, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import TeamBadge, { TEAMS } from '../TeamBadge';
import { exportAllQuinielas, exportParticipantQuiniela } from '../../services/quinielaExport';
import { getRosterEntry } from '../../services/participantEmails';

export default function AdminParticipants({
  participants, matches,
  onAdd, onRemove, onEdit, onPhotoUpload, onRemovePhoto, onSetTeam, onSetEmail,
  newName, setNewName, statusMessage
}) {
  const withEmail = participants.filter(p => p.email).length;
  const withTeam  = participants.filter(p => p.team).length;
  const autoLinkEmails = () => {
    let assigned = 0;
    let pending = 0;
    participants.forEach(participant => {
      const roster = getRosterEntry(participant.name);
      if (!roster?.email) { pending += 1; return; }
      if (!participant.email) { onSetEmail(participant.name, roster.email); assigned += 1; }
      if (!participant.team && roster.team) onSetTeam(participant.name, roster.team);
    });
    window.alert(`${assigned} correos asignados · ${pending} pendientes de revisión`);
  };

  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <div>
          <h2>Participantes</h2>
          <p>{participants.length} participantes · {withEmail} con correo · {withTeam} con equipo asignado</p>
        </div>
        <button
          type="button"
          className="admin-header-action-btn"
          onClick={() => exportAllQuinielas(participants, matches)}
          disabled={participants.length === 0}
        >
          <Download size={14} /> Descargar todo
        </button>
        <button type="button" className="admin-header-action-btn" onClick={autoLinkEmails}>
          <Mail size={14} /> Vincular correos automáticamente
        </button>
      </div>

      {statusMessage && <div className="admin-status-banner">{statusMessage}</div>}

      <form onSubmit={onAdd} className="participant-add-form" style={{ marginBottom: '1rem' }}>
        <input type="text" className="participant-form-input" placeholder="Agregar participante manualmente…" value={newName} onChange={e => setNewName(e.target.value)} />
        <button type="submit" className="participant-form-submit-btn" title="Agregar"><Plus size={16} /></button>
      </form>

      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}></th>
              <th>Nombre</th>
              <th>Correo</th>
              <th style={{ width: 130 }}>Equipo</th>
              <th className="crm-th-center" style={{ width: 72 }}>Pronóst.</th>
              <th className="crm-th-center" style={{ width: 130 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {participants.map(participant => {
              const roster = getRosterEntry(participant.name);
              return (
                <tr key={participant.name} className="crm-row">
                  <td>
                    <div className="avatar-team-wrap crm-avatar-wrap">
                      {participant.photo
                        ? <div className="crm-avatar has-photo"><img src={participant.photo} alt={participant.name} /></div>
                        : <div className="crm-avatar">{participant.avatar}</div>}
                      <TeamBadge team={participant.team} className="on-avatar" />
                    </div>
                  </td>
                  <td>
                    <span className="crm-name">{participant.name}</span>
                  </td>
                  <td>
                    {participant.email ? (
                      <span className="crm-email"><Mail size={11} /> {participant.email}</span>
                    ) : roster?.email ? (
                      <button
                        className="crm-email-assign-btn"
                        onClick={() => { onSetEmail(participant.name, roster.email); if (!participant.team && roster.team) onSetTeam(participant.name, roster.team); }}
                        title="Asignar correo del roster"
                      >
                        <Mail size={11} /> {roster.email}
                      </button>
                    ) : (
                      <span className="crm-email missing">Sin correo</span>
                    )}
                  </td>
                  <td>
                    <select
                      className="crm-team-select"
                      value={participant.team || ''}
                      onChange={e => onSetTeam(participant.name, e.target.value)}
                    >
                      <option value="">Sin equipo</option>
                      {Object.entries(TEAMS).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="crm-th-center">
                    <span className="crm-count">{Object.keys(participant.predictions || {}).length}</span>
                  </td>
                  <td>
                    <div className="crm-actions">
                      <label className="crm-action-btn" title={participant.photo ? 'Cambiar foto' : 'Subir foto'}>
                        <Camera size={13} />
                        <input type="file" accept="image/*" onChange={e => { onPhotoUpload(participant.name, e.target.files?.[0]); e.target.value = ''; }} hidden />
                      </label>
                      {participant.photo && (
                        <button className="crm-action-btn danger" onClick={() => onRemovePhoto(participant.name)} title="Quitar foto"><Trash2 size={11} /></button>
                      )}
                      <button className="crm-action-btn" onClick={() => exportParticipantQuiniela(participant, matches)} title="Descargar quiniela"><Download size={13} /></button>
                      <button className="crm-action-btn" onClick={() => onEdit(participant)} title="Editar"><Pencil size={13} /></button>
                      <button className="crm-action-btn danger" onClick={() => onRemove(participant.name)} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
