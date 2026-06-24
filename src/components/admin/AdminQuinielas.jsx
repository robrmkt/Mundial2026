import { AlertCircle, CheckCircle2, FileText, KeyRound, Pencil, Save, Trash2, Upload } from 'lucide-react';

export default function AdminQuinielas({
  review, setReview, reviewedPredictions, onSaveReview, onUpload, isAnalyzing, statusMessage,
  documents, onRemoveDocument, apiKey, onSaveApiKey, keyVisible, setKeyVisible, isSuper
}) {
  const updatePrediction = (matchId, field, value) => {
    const num = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setReview(prev => ({
      ...prev,
      predictions: { ...prev.predictions, [matchId]: { ...(prev.predictions[matchId] || { homeScore: 0, awayScore: 0 }), [field]: num } }
    }));
  };
  const removePrediction = (matchId) => {
    setReview(prev => { const n = { ...prev.predictions }; delete n[matchId]; return { ...prev, predictions: n }; });
  };

  return (
    <div className="admin-section-body">
      <div className="admin-section-header">
        <h2>Quinielas</h2>
        <p>Sube documentos, revisa y guarda los pronósticos de cada participante</p>
      </div>

      {/* Upload */}
      <div className="admin-card excel-uploader-card">
        <h3 className="admin-section-title"><Upload size={16} /> Subir documento</h3>
        <p className="admin-section-desc">Excel, PDF, XML o texto.</p>
        <label className={`excel-upload-dropzone ${isAnalyzing ? 'is-analyzing' : ''}`}>
          <Upload size={28} className="upload-dropzone-icon" />
          <span className="upload-dropzone-title">{isAnalyzing ? 'Analizando…' : 'Elegir archivo'}</span>
          <span className="upload-dropzone-subtitle">La revisión aparece abajo</span>
          <input type="file" accept=".xlsx,.xls,.csv,.xml,.pdf,.txt" onChange={onUpload} className="upload-dropzone-input" />
        </label>
        {statusMessage && <div className="excel-upload-success-badge">{statusMessage}</div>}
        {isSuper && (
          <div className="openai-key-row">
            <label className="review-field-label">
              <span className="openai-key-label"><KeyRound size={13} /> API key de OpenAI (opcional)</span>
              <div className="openai-key-controls">
                <input type={keyVisible ? 'text' : 'password'} className="review-name-input" placeholder="sk-..." value={apiKey} onChange={e => onSaveApiKey(e.target.value)} />
                <button type="button" className="openai-key-toggle" onClick={() => setKeyVisible(v => !v)}>{keyVisible ? 'Ocultar' : 'Ver'}</button>
              </div>
            </label>
            <span className="openai-key-hint">Solo en este navegador.</span>
          </div>
        )}
      </div>

      {/* Review */}
      <div className="admin-card document-review-card">
        <div className="scoreboard-manager-header">
          <h3 className="admin-section-title"><Pencil size={16} /> Revisión y edición</h3>
          <span className={`review-confidence-badge ${review.confidence}`}>
            {review.usedAI ? 'Leído con IA' : review.confidence === 'high' ? 'Listo' : review.sourceFileName ? 'Revisar' : 'Sin documento'}
          </span>
        </div>

        {review.sourceFileName ? (
          <>
            <div className="review-file-strip"><FileText size={16} /><span>{review.sourceFileName}</span></div>
            {review.warnings.length > 0 && (
              <div className="review-warning-list">
                {review.warnings.map(w => <div key={w} className="review-warning-item"><AlertCircle size={14} />{w}</div>)}
              </div>
            )}
            <label className="review-field-label">
              ¿Quién envió esta quiniela?
              <input className="review-name-input" value={review.participantName} onChange={e => setReview(prev => ({ ...prev, participantName: e.target.value }))} placeholder="Nombre del colaborador" />
            </label>
            <div className="review-table-header">
              <span>{reviewedPredictions.length} pronósticos</span>
              <button className="review-save-btn" onClick={onSaveReview}><Save size={14} /> Guardar</button>
            </div>
            <div className="prediction-review-list">
              {reviewedPredictions.length === 0 ? (
                <div className="empty-matches-state">Sin pronósticos legibles. Prueba otro formato.</div>
              ) : (
                reviewedPredictions.map(({ match, matchId, prediction }) => (
                  <div key={matchId} className="prediction-review-row">
                    <div className="review-match-copy">
                      <span className="admin-match-id">#{match.id}</span>
                      <strong>{match.homeFlag} {match.homeTeam}</strong>
                      <span>vs</span>
                      <strong>{match.awayTeam} {match.awayFlag}</strong>
                    </div>
                    <div className="review-score-editor">
                      <input type="number" min="0" className="admin-score-input" value={prediction.homeScore} onChange={e => updatePrediction(matchId, 'homeScore', e.target.value)} />
                      <span className="admin-score-sep">-</span>
                      <input type="number" min="0" className="admin-score-input" value={prediction.awayScore} onChange={e => updatePrediction(matchId, 'awayScore', e.target.value)} />
                      <button className="participant-admin-delete-btn" onClick={() => removePrediction(matchId)} title="Quitar"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="review-empty-state"><CheckCircle2 size={22} /><p>Sin documento. Sube una quiniela o toca el lápiz de un participante para editar.</p></div>
        )}
      </div>

      {/* Documents */}
      <div className="admin-card documents-card">
        <h3 className="admin-section-title"><FileText size={16} /> Documentos cargados</h3>
        <div className="documents-list">
          {documents.length === 0 ? (
            <div className="participants-empty-state">Todavía no hay documentos cargados.</div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="document-history-item">
                <div><strong>{doc.fileName}</strong><span>{doc.participantName} · {doc.predictionCount} pronósticos</span></div>
                <button className="participant-admin-delete-btn" onClick={() => onRemoveDocument(doc.id)} title="Eliminar"><Trash2 size={14} /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
