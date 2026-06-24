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

  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <h2>Participantes</h2>
        <p>{participants.length} participantes · {withEmail} con correo · {withTeam} con equipo</p>
      </div>

      <div className="admin-card participants-card">
        <div className="participants-card-head">
          <h3 className="admin-section-title">Lista</h3>
          <button
            type="button"
            className="admin-export-all-btn"
            onClick={() => exportAllQuinielas(participants, matches)}
            disabled={participants.length === 0}
          >
            <Download size={14} /> Descargar todo
          </button>
        </div>

        <form onSubmit={onAdd} className="participant-add-form">
          <input type="text" className="participant-form-input" placeholder="Agregar nombre manual…" value={newName} onChange={e => setNewName(e.target.value)} />
          <button type="submit" className="participant-form-submit-btn" title="Agregar"><Plus size={16} /></button>
        </form>

        {statusMessage && <div className="excel-upload-success-badge" style={{ marginBottom: '0.5rem' }}>{statusMessage}</div>}

        <div className="participants-scroll-list">
          {participants.map(participant => {
            const roster = getRosterEntry(participant.name);
            return (
              <div key={participant.name} className="participant-admin-item">
                <div className="participant-admin-info">
                  <div className="avatar-team-wrap">
                    {participant.photo
                      ? <div className="participant-admin-avatar has-photo"><img src={participant.photo} alt={participant.name} /></div>
                      : <div className="participant-admin-avatar">{participant.avatar}</div>}
                    <TeamBadge team={participant.team} className="on-avatar" />
                  </div>
                  <div className="participant-admin-copy">
                    <span className="participant-admin-name">{participant.name}</span>
                    <span className="participant-admin-meta">{Object.keys(participant.predictions || {}).length} pronósticos</span>
                    {participant.email
                      ? <span className="participant-admin-email"><Mail size={10} /> {participant.email}</span>
                      : roster?.email
                        ? <button className="participant-admin-email-link" onClick={() => { onSetEmail(participant.name, roster.email); if (!participant.team && roster.team) onSetTeam(participant.name, roster.team); }} title="Asignar correo del roster"><Mail size={10} /> {roster.email}</button>
                        : <span className="participant-admin-email missing">Sin correo</span>}
                  </div>
                </div>
                <div className="participant-admin-actions">
                  <select className="participant-admin-team-select" value={participant.team || ''} onChange={e => onSetTeam(participant.name, e.target.value)} title={`Equipo de ${participant.name}`}>
                    <option value="">Sin equipo</option>
                    {Object.entries(TEAMS).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
                  </select>
                  <label className="participant-admin-photo-btn" title={participant.photo ? 'Cambiar foto' : 'Subir foto'}>
                    <Camera size={13} />
                    <input type="file" accept="image/*" onChange={e => { onPhotoUpload(participant.name, e.target.files?.[0]); e.target.value = ''; }} hidden />
                  </label>
                  {participant.photo && <button onClick={() => onRemovePhoto(participant.name)} className="participant-admin-photo-remove" title="Quitar foto"><Trash2 size={11} /></button>}
                  <button type="button" onClick={() => exportParticipantQuiniela(participant, matches)} className="participant-admin-export-btn" title="Descargar quiniela"><Download size={13} /></button>
                  <button type="button" onClick={() => onEdit(participant)} className="participant-admin-edit-btn" title="Editar"><Pencil size={13} /></button>
                  <button type="button" onClick={() => onRemove(participant.name)} className="participant-admin-delete-btn" title="Eliminar"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
