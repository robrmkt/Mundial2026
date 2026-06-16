import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Users2,
  Wifi
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { analyzeTextWithOpenAI, extractPdfText, getOpenAiKey, setOpenAiKey } from '../services/aiReader';
import { resizeImageToDataUrl } from '../services/photos';
import { exportAllQuinielas, exportParticipantQuiniela } from '../services/quinielaExport';

const emptyReview = {
  participantName: '',
  originalName: '',
  confidence: 'manual',
  predictions: {},
  warnings: [],
  sourceFileName: '',
  usedAI: false
};

const scorePattern = /(\d{1,2})\s*[-:]\s*(\d{1,2})/;

function makeInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'NN';
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cleanParticipantName(value) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  const labelMatch = text.match(/(?:participante|nombre|colaborador|enviado por|capturista)\s*:?\s*_*([^_|,;]+)/i);
  const candidate = labelMatch ? labelMatch[1] : text;
  return candidate
    .replace(/area\s*:?.*$/i, '')
    .replace(/[_*]+/g, '')
    .trim();
}

function extractNameFromText(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines.slice(0, 18)) {
    const name = cleanParticipantName(line);
    if (name && name.length >= 3 && !scorePattern.test(name)) return name;
  }
  return '';
}

function parsePredictionsFromRows(rows, matches) {
  const predictions = {};

  rows.forEach(row => {
    const cells = row.map(cell => String(cell ?? '').trim()).filter(Boolean);
    if (!cells.length) return;

    const joined = cells.join(' ');
    const byId = Number.parseInt(cells[0], 10);
    const idFromFirstCell = matches.some(match => match.id === byId) ? byId : null;

    let matchedMatch = idFromFirstCell ? matches.find(match => match.id === idFromFirstCell) : null;
    if (!matchedMatch) {
      const normalized = normalizeText(joined);
      matchedMatch = matches.find(match =>
        normalized.includes(normalizeText(match.homeTeam)) &&
        normalized.includes(normalizeText(match.awayTeam))
      );
    }

    if (!matchedMatch) return;

    const scoreCell = [...cells].reverse().find(cell => scorePattern.test(cell));
    const scoreMatch = scoreCell?.match(scorePattern);
    if (!scoreMatch) return;

    predictions[matchedMatch.id] = {
      homeScore: Number.parseInt(scoreMatch[1], 10),
      awayScore: Number.parseInt(scoreMatch[2], 10)
    };
  });

  return predictions;
}

function parseXmlDocument(text, matches) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const hasParserError = doc.querySelector('parsererror');
  if (hasParserError) throw new Error('XML inválido');

  const bodyText = doc.documentElement?.textContent || text;
  const rows = bodyText
    .split(/\r?\n|(?=<)/)
    .map(line => [line.replace(/<[^>]+>/g, ' ').trim()])
    .filter(row => row[0]);

  return {
    participantName: extractNameFromText(bodyText),
    predictions: parsePredictionsFromRows(rows, matches),
    rawText: bodyText
  };
}

function parsePlainTextDocument(text, matches) {
  const rows = text
    .split(/\r?\n/)
    .map(line => [line.trim()])
    .filter(row => row[0]);

  return {
    participantName: extractNameFromText(text),
    predictions: parsePredictionsFromRows(rows, matches),
    rawText: text
  };
}

function parseExcelDocument(data, matches) {
  const workbook = XLSX.read(data, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
  const flatCells = rows.flat().map(cell => String(cell ?? '').trim()).filter(Boolean);
  const rawText = rows.map(row => row.map(cell => String(cell ?? '').trim()).join(' | ')).join('\n');
  const participantName = cleanParticipantName(worksheet.A2?.v) || extractNameFromText(flatCells.join('\n'));

  return {
    participantName,
    predictions: parsePredictionsFromRows(rows, matches),
    rawText
  };
}

export default function AdminPanel({
  matches,
  participants,
  setParticipants,
  documents,
  setDocuments,
  simActive,
  setSimActive,
  handleReset,
  onSyncNow,
  syncState,
  session,
  onLogout
}) {
  const isSuper = session?.role === 'superadmin';
  const [review, setReview] = useState(emptyReview);
  const [statusMessage, setStatusMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newName, setNewName] = useState('');
  // La API key de OpenAI es exclusiva del super admin: solo él la lee y la usa.
  const [apiKey, setApiKey] = useState(() => (isSuper ? getOpenAiKey() : ''));
  const [keyVisible, setKeyVisible] = useState(false);

  const reviewedPredictions = useMemo(
    () => Object.entries(review.predictions)
      .map(([matchId, prediction]) => ({
        match: matches.find(match => String(match.id) === String(matchId)),
        matchId,
        prediction
      }))
      .filter(item => item.match)
      .sort((a, b) => Number(a.matchId) - Number(b.matchId)),
    [matches, review.predictions]
  );

  const saveApiKey = (value) => {
    setApiKey(value);
    setOpenAiKey(value);
  };

  const updatePrediction = (matchId, field, value) => {
    const numericValue = value === '' ? '' : Math.max(0, Number.parseInt(value, 10) || 0);
    setReview(prev => ({
      ...prev,
      predictions: {
        ...prev.predictions,
        [matchId]: {
          ...(prev.predictions[matchId] || { homeScore: 0, awayScore: 0 }),
          [field]: numericValue
        }
      }
    }));
  };

  const removePrediction = (matchId) => {
    setReview(prev => {
      const nextPredictions = { ...prev.predictions };
      delete nextPredictions[matchId];
      return { ...prev, predictions: nextPredictions };
    });
  };

  const analyzeFile = async (file) => {
    setIsAnalyzing(true);
    setStatusMessage('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let result = { participantName: '', predictions: {}, rawText: '' };
      let usedAI = false;
      const warnings = [];

      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const buffer = await file.arrayBuffer();
        result = parseExcelDocument(buffer, matches);
      } else if (ext === 'xml') {
        const text = await file.text();
        result = parseXmlDocument(text, matches);
      } else if (['txt', 'text'].includes(ext)) {
        const text = await file.text();
        result = parsePlainTextDocument(text, matches);
      } else if (ext === 'pdf') {
        const pdfText = await extractPdfText(file);
        result = parsePlainTextDocument(pdfText, matches);
      } else {
        warnings.push('Formato no reconocido. Puedes capturar el nombre y resultados manualmente.');
      }

      // Respaldo con IA: solo el super admin puede gastar la API key de OpenAI.
      const weakParse = Object.keys(result.predictions).length < 3 || !result.participantName;
      if (weakParse && isSuper && apiKey && result.rawText) {
        try {
          const ai = await analyzeTextWithOpenAI(result.rawText, matches, apiKey);
          if (Object.keys(ai.predictions).length > Object.keys(result.predictions).length) {
            result.predictions = ai.predictions;
            usedAI = true;
          }
          if (!result.participantName && ai.participantName) {
            result.participantName = ai.participantName;
            usedAI = true;
          }
        } catch (aiError) {
          console.error(aiError);
          warnings.push(`La lectura con IA falló: ${aiError.message}`);
        }
      } else if (weakParse && isSuper && !apiKey && ext === 'pdf') {
        warnings.push('Tip: guarda tu API key de OpenAI aquí abajo para interpretar PDFs difíciles automáticamente.');
      }

      if (!result.participantName) warnings.push('No detecté quién envió esta quiniela. Escribe su nombre antes de guardar.');
      if (Object.keys(result.predictions).length === 0) warnings.push('No detecté marcadores confiables en el documento.');

      setReview({
        participantName: result.participantName,
        originalName: '',
        confidence: warnings.length ? 'needs-review' : 'high',
        predictions: result.predictions,
        warnings,
        sourceFileName: file.name,
        usedAI
      });
      setDocuments(prev => [
        {
          id: Date.now(),
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          participantName: result.participantName || 'Pendiente de nombre',
          predictionCount: Object.keys(result.predictions).length,
          status: warnings.length ? 'needs-review' : 'ready'
        },
        ...prev
      ]);
      setStatusMessage(
        `${usedAI ? 'Analizado con IA (OpenAI): ' : 'Documento analizado: '}${Object.keys(result.predictions).length} pronósticos detectados.`
      );
    } catch (error) {
      console.error(error);
      setStatusMessage('No pude interpretar el archivo. Revisa el formato o captura los datos manualmente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) analyzeFile(file);
    event.target.value = '';
  };

  const editParticipant = (participant) => {
    setReview({
      participantName: participant.name,
      originalName: participant.name,
      confidence: 'manual',
      predictions: { ...participant.predictions },
      warnings: [],
      sourceFileName: `Edición de ${participant.name}`,
      usedAI: false
    });
    setStatusMessage(`Editando a ${participant.name}. Ajusta nombre o marcadores y guarda.`);
  };

  const saveReview = () => {
    const participantName = review.participantName.trim();
    if (!participantName) {
      setStatusMessage('Falta el nombre del participante.');
      return;
    }

    const predictions = Object.fromEntries(
      Object.entries(review.predictions)
        .filter(([, prediction]) => prediction.homeScore !== '' && prediction.awayScore !== '')
        .map(([matchId, prediction]) => [
          matchId,
          {
            homeScore: Number(prediction.homeScore),
            awayScore: Number(prediction.awayScore)
          }
        ])
    );

    if (!Object.keys(predictions).length) {
      setStatusMessage('Falta al menos un pronóstico para guardar.');
      return;
    }

    setParticipants(prev => {
      const lower = participantName.toLowerCase();
      const originalLower = review.originalName.toLowerCase();
      const filtered = prev.filter(participant => {
        const pLower = participant.name.toLowerCase();
        return pLower !== lower && (!originalLower || pLower !== originalLower);
      });
      return [
        ...filtered,
        {
          name: participantName,
          avatar: makeInitials(participantName),
          predictions
        }
      ];
    });

    setStatusMessage(`${participantName} guardado con ${Object.keys(predictions).length} pronósticos.`);
    setReview(emptyReview);
  };

  const addParticipant = (event) => {
    event.preventDefault();
    const participantName = newName.trim();
    if (!participantName) return;

    setParticipants(prev => [
      ...prev.filter(participant => participant.name.toLowerCase() !== participantName.toLowerCase()),
      { name: participantName, avatar: makeInitials(participantName), predictions: {} }
    ]);
    setNewName('');
  };

  const removeParticipant = (name) => {
    setParticipants(prev => prev.filter(participant => participant.name !== name));
  };

  const handlePhotoUpload = async (participantName, file) => {
    if (!file) return;
    try {
      setStatusMessage(`Procesando foto de ${participantName}…`);
      const photo = await resizeImageToDataUrl(file);
      setParticipants(prev => prev.map(p => (p.name === participantName ? { ...p, photo } : p)));
      setStatusMessage(`Foto de ${participantName} guardada.`);
    } catch (error) {
      console.error(error);
      setStatusMessage(`No pude procesar la foto: ${error.message}`);
    }
  };

  const removePhoto = (participantName) => {
    setParticipants(prev => prev.map(p => {
      if (p.name !== participantName) return p;
      const next = { ...p };
      delete next.photo;
      return next;
    }));
  };

  const removeDocument = (id) => {
    setDocuments(prev => prev.filter(document => document.id !== id));
  };

  return (
    <div className="admin-workflow">
      <section className="admin-hero-card">
        <div>
          <span className="admin-kicker"><Sparkles size={14} /> Panel del organizador</span>
          <h2>Sube quinielas, revisa y guarda</h2>
          <p>
            Los marcadores reales llegan solos del feed en vivo; aquí administras
            participantes y sus pronósticos.
            {isSuper
              ? ' Como super administrador tienes control total.'
              : ' Puedes subir, editar y borrar quinielas; reiniciar todo queda reservado al super administrador.'}
          </p>
        </div>
        <div className="admin-hero-actions">
          <span className="admin-session-pill">
            <ShieldCheck size={14} />
            {session?.displayName || 'Sesión'}
            <em>{isSuper ? 'super admin' : 'admin'}</em>
          </span>
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
              <RefreshCw size={15} /> Reiniciar
            </button>
          )}
          <button className="admin-btn-action btn-logout" onClick={onLogout}>
            <LogOut size={15} /> Salir
          </button>
        </div>
        {syncState?.lastSync && (
          <span className="admin-sync-note">
            Última sincronización: {syncState.lastSync.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            {syncState.status === 'error' ? ' · con errores, reintentando' : ''}
          </span>
        )}
      </section>

      <div className="admin-grid-modern">
        <div className="admin-sidebar-section">
          <div className="admin-card excel-uploader-card">
            <h2 className="admin-section-title">
              <Upload size={18} />
              Subir documento
            </h2>
            <p className="admin-section-desc">
              Excel, PDF, XML o texto. Si el nombre no viene claro, te lo pedirá antes de guardar.
            </p>

            <label className={`excel-upload-dropzone ${isAnalyzing ? 'is-analyzing' : ''}`}>
              <Upload size={30} className="upload-dropzone-icon" />
              <span className="upload-dropzone-title">{isAnalyzing ? 'Analizando…' : 'Elegir Excel, PDF, XML o texto'}</span>
              <span className="upload-dropzone-subtitle">La revisión aparece al centro</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.xml,.pdf,.txt"
                onChange={handleUpload}
                className="upload-dropzone-input"
              />
            </label>

            {statusMessage && (
              <div className="excel-upload-success-badge">
                {statusMessage}
              </div>
            )}

            {isSuper && (
              <div className="openai-key-row">
                <label className="review-field-label">
                  <span className="openai-key-label"><KeyRound size={13} /> API key de OpenAI (opcional, para PDFs y formatos difíciles)</span>
                  <div className="openai-key-controls">
                    <input
                      type={keyVisible ? 'text' : 'password'}
                      className="review-name-input"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(event) => saveApiKey(event.target.value)}
                    />
                    <button type="button" className="openai-key-toggle" onClick={() => setKeyVisible(v => !v)}>
                      {keyVisible ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </label>
                <span className="openai-key-hint">Se guarda solo en este navegador.</span>
              </div>
            )}
          </div>

          <div className="admin-card participants-card">
            <h2 className="admin-section-title">
              <Users2 size={18} />
              Participantes ({participants.length})
            </h2>
            <button
              type="button"
              className="admin-export-all-btn"
              onClick={() => exportAllQuinielas(participants, matches)}
              disabled={participants.length === 0}
            >
              <Download size={14} />
              Descargar todo
            </button>
            <form onSubmit={addParticipant} className="participant-add-form">
              <input
                type="text"
                className="participant-form-input"
                placeholder="Agregar nombre manual…"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <button type="submit" className="participant-form-submit-btn" title="Agregar participante">
                <Plus size={16} />
              </button>
            </form>

            <div className="participants-scroll-list">
              {participants.map(participant => (
                <div key={participant.name} className="participant-admin-item">
                  <div className="participant-admin-info">
                    {participant.photo ? (
                      <div className="participant-admin-avatar has-photo"><img src={participant.photo} alt={participant.name} /></div>
                    ) : (
                      <div className="participant-admin-avatar">{participant.avatar}</div>
                    )}
                    <div className="participant-admin-copy">
                      <span className="participant-admin-name">{participant.name}</span>
                      <span className="participant-admin-meta">{Object.keys(participant.predictions || {}).length} pronósticos</span>
                    </div>
                  </div>
                  <div className="participant-admin-actions">
                    <label
                      className="participant-admin-photo-btn"
                      title={participant.photo ? `Cambiar foto de ${participant.name}` : `Subir foto de ${participant.name}`}
                    >
                      <Camera size={13} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => { handlePhotoUpload(participant.name, event.target.files?.[0]); event.target.value = ''; }}
                        hidden
                      />
                    </label>
                    {participant.photo && (
                      <button
                        onClick={() => removePhoto(participant.name)}
                        className="participant-admin-photo-remove"
                        title={`Quitar foto de ${participant.name}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => exportParticipantQuiniela(participant, matches)}
                      className="participant-admin-export-btn"
                      title={`Descargar quiniela de ${participant.name}`}
                    >
                      <Download size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => editParticipant(participant)}
                      className="participant-admin-edit-btn"
                      title={`Editar a ${participant.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant.name)}
                      className="participant-admin-delete-btn"
                      title={`Eliminar a ${participant.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-main-section">
          <div className="admin-card document-review-card">
            <div className="scoreboard-manager-header">
              <h2 className="admin-section-title">
                <Pencil size={18} />
                Revisión y edición
              </h2>
              <span className={`review-confidence-badge ${review.confidence}`}>
                {review.usedAI ? 'Leído con IA' : review.confidence === 'high' ? 'Listo' : review.sourceFileName ? 'Revisar' : 'Sin documento'}
              </span>
            </div>

            {review.sourceFileName ? (
              <>
                <div className="review-file-strip">
                  <FileText size={17} />
                  <span>{review.sourceFileName}</span>
                </div>

                {review.warnings.length > 0 && (
                  <div className="review-warning-list">
                    {review.warnings.map(warning => (
                      <div key={warning} className="review-warning-item">
                        <AlertCircle size={14} />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                <label className="review-field-label">
                  ¿Quién envió esta quiniela?
                  <input
                    className="review-name-input"
                    value={review.participantName}
                    onChange={(event) => setReview(prev => ({ ...prev, participantName: event.target.value }))}
                    placeholder="Escribe el nombre del colaborador"
                  />
                </label>

                <div className="review-table-header">
                  <span>{reviewedPredictions.length} pronósticos</span>
                  <button className="review-save-btn" onClick={saveReview}>
                    <Save size={15} /> Guardar
                  </button>
                </div>

                <div className="prediction-review-list">
                  {reviewedPredictions.length === 0 ? (
                    <div className="empty-matches-state">
                      No hay pronósticos legibles. Prueba con otro formato o guarda tu API key de OpenAI para usar la lectura con IA.
                    </div>
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
                          <input
                            type="number"
                            min="0"
                            className="admin-score-input"
                            value={prediction.homeScore}
                            onChange={(event) => updatePrediction(matchId, 'homeScore', event.target.value)}
                          />
                          <span className="admin-score-sep">-</span>
                          <input
                            type="number"
                            min="0"
                            className="admin-score-input"
                            value={prediction.awayScore}
                            onChange={(event) => updatePrediction(matchId, 'awayScore', event.target.value)}
                          />
                          <button className="participant-admin-delete-btn" onClick={() => removePrediction(matchId)} title="Quitar pronóstico">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="review-empty-state">
                <CheckCircle2 size={38} />
                <h3>Sin documento en revisión</h3>
                <p>Sube una quiniela o pulsa el lápiz junto a un participante para editar sus pronósticos.</p>
              </div>
            )}
          </div>
        </div>

        <div className="admin-card documents-card">
          <h2 className="admin-section-title">
            <FileText size={18} />
            Documentos cargados
          </h2>
          <div className="documents-list">
            {documents.length === 0 ? (
              <div className="participants-empty-state">Todavía no hay documentos cargados.</div>
            ) : (
              documents.map(document => (
                <div key={document.id} className="document-history-item">
                  <div>
                    <strong>{document.fileName}</strong>
                    <span>{document.participantName} · {document.predictionCount} pronósticos</span>
                  </div>
                  <button className="participant-admin-delete-btn" onClick={() => removeDocument(document.id)} title="Eliminar documento">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
