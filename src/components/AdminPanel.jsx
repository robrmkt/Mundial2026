import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { analyzeTextWithOpenAI, extractPdfText, getOpenAiKey, setOpenAiKey } from '../services/aiReader';
import { resizeImageToDataUrl } from '../services/photos';
import AdminConsoleLayout from './admin/AdminConsoleLayout';
import AdminOverview from './admin/AdminOverview';
import AdminQuinielas from './admin/AdminQuinielas';
import AdminParticipants from './admin/AdminParticipants';
import AdminPredictionExtension from './admin/AdminPredictionExtension';
import NotificationCenter from './admin/NotificationCenter';
import AdminSystem from './admin/AdminSystem';

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
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'NN';
}
function normalizeText(v) {
  return String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function cleanParticipantName(v) {
  if (!v) return '';
  const text = String(v).replace(/\s+/g, ' ').trim();
  const m = text.match(/(?:participante|nombre|colaborador|enviado por|capturista)\s*:?\s*_*([^_|,;]+)/i);
  const c = m ? m[1] : text;
  return c.replace(/area\s*:?.*$/i, '').replace(/[_*]+/g, '').trim();
}
function extractNameFromText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 18)) {
    const name = cleanParticipantName(line);
    if (name && name.length >= 3 && !scorePattern.test(name)) return name;
  }
  return '';
}
function parsePredictionsFromRows(rows, matches) {
  const preds = {};
  rows.forEach(row => {
    const cells = row.map(c => String(c ?? '').trim()).filter(Boolean);
    if (!cells.length) return;
    const joined = cells.join(' ');
    const byId = Number.parseInt(cells[0], 10);
    const idFromFirst = matches.some(m => m.id === byId) ? byId : null;
    let found = idFromFirst ? matches.find(m => m.id === idFromFirst) : null;
    if (!found) {
      const n = normalizeText(joined);
      found = matches.find(m => n.includes(normalizeText(m.homeTeam)) && n.includes(normalizeText(m.awayTeam)));
    }
    if (!found) return;
    const scoreCell = [...cells].reverse().find(c => scorePattern.test(c));
    const sm = scoreCell?.match(scorePattern);
    if (!sm) return;
    preds[found.id] = { homeScore: Number.parseInt(sm[1], 10), awayScore: Number.parseInt(sm[2], 10) };
  });
  return preds;
}
function parseXmlDocument(text, matches) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML inválido');
  const bodyText = doc.documentElement?.textContent || text;
  const rows = bodyText.split(/\r?\n|(?=<)/).map(l => [l.replace(/<[^>]+>/g, ' ').trim()]).filter(r => r[0]);
  return { participantName: extractNameFromText(bodyText), predictions: parsePredictionsFromRows(rows, matches), rawText: bodyText };
}
function parsePlainTextDocument(text, matches) {
  const rows = text.split(/\r?\n/).map(l => [l.trim()]).filter(r => r[0]);
  return { participantName: extractNameFromText(text), predictions: parsePredictionsFromRows(rows, matches), rawText: text };
}
function parseExcelDocument(data, matches) {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
  const flatCells = rows.flat().map(c => String(c ?? '').trim()).filter(Boolean);
  const rawText = rows.map(r => r.map(c => String(c ?? '').trim()).join(' | ')).join('\n');
  const participantName = cleanParticipantName(ws.A2?.v) || extractNameFromText(flatCells.join('\n'));
  return { participantName, predictions: parsePredictionsFromRows(rows, matches), rawText };
}

export default function AdminPanel({
  matches, participants, setParticipants,
  documents, setDocuments,
  simActive, setSimActive, handleReset,
  onSyncNow, syncState, session, visitStats, onLogout
}) {
  const isSuper = session?.role === 'superadmin';
  const [activeSection, setActiveSection] = useState('overview');
  const [review, setReview] = useState(emptyReview);
  const [statusMessage, setStatusMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newName, setNewName] = useState('');
  const [apiKey, setApiKey] = useState(() => (isSuper ? getOpenAiKey() : ''));
  const [keyVisible, setKeyVisible] = useState(false);

  const reviewedPredictions = useMemo(
    () => Object.entries(review.predictions)
      .map(([matchId, pred]) => ({ match: matches.find(m => String(m.id) === String(matchId)), matchId, prediction: pred }))
      .filter(item => item.match)
      .sort((a, b) => Number(a.matchId) - Number(b.matchId)),
    [matches, review.predictions]
  );

  const saveApiKey = (v) => { setApiKey(v); setOpenAiKey(v); };

  const analyzeFile = async (file) => {
    setIsAnalyzing(true); setStatusMessage('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let result = { participantName: '', predictions: {}, rawText: '' };
      let usedAI = false;
      const warnings = [];
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        result = parseExcelDocument(await file.arrayBuffer(), matches);
      } else if (ext === 'xml') {
        result = parseXmlDocument(await file.text(), matches);
      } else if (['txt', 'text'].includes(ext)) {
        result = parsePlainTextDocument(await file.text(), matches);
      } else if (ext === 'pdf') {
        result = parsePlainTextDocument(await extractPdfText(file), matches);
      } else {
        warnings.push('Formato no reconocido. Puedes capturar manualmente.');
      }
      const weak = Object.keys(result.predictions).length < 3 || !result.participantName;
      if (weak && isSuper && apiKey && result.rawText) {
        try {
          const ai = await analyzeTextWithOpenAI(result.rawText, matches, apiKey);
          if (Object.keys(ai.predictions).length > Object.keys(result.predictions).length) { result.predictions = ai.predictions; usedAI = true; }
          if (!result.participantName && ai.participantName) { result.participantName = ai.participantName; usedAI = true; }
        } catch (e) { warnings.push(`IA falló: ${e.message}`); }
      } else if (weak && isSuper && !apiKey && ext === 'pdf') {
        warnings.push('Guarda tu API key de OpenAI para interpretar PDFs difíciles automáticamente.');
      }
      if (!result.participantName) warnings.push('No detecté quién envió esta quiniela.');
      if (Object.keys(result.predictions).length === 0) warnings.push('No detecté marcadores confiables.');
      setReview({ participantName: result.participantName, originalName: '', confidence: warnings.length ? 'needs-review' : 'high', predictions: result.predictions, warnings, sourceFileName: file.name, usedAI });
      setDocuments(prev => [{ id: Date.now(), fileName: file.name, uploadedAt: new Date().toISOString(), participantName: result.participantName || 'Pendiente', predictionCount: Object.keys(result.predictions).length, status: warnings.length ? 'needs-review' : 'ready' }, ...prev]);
      setStatusMessage(`${usedAI ? 'Analizado con IA: ' : ''}${Object.keys(result.predictions).length} pronósticos detectados.`);
      setActiveSection('quinielas');
    } catch (e) {
      setStatusMessage('No pude interpretar el archivo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = (e) => { const f = e.target.files?.[0]; if (f) analyzeFile(f); e.target.value = ''; };

  const editParticipant = (p) => {
    setReview({ participantName: p.name, originalName: p.name, confidence: 'manual', predictions: { ...p.predictions }, warnings: [], sourceFileName: `Edición de ${p.name}`, usedAI: false });
    setStatusMessage(`Editando a ${p.name}.`);
    setActiveSection('quinielas');
  };

  const saveReview = () => {
    const name = review.participantName.trim();
    if (!name) { setStatusMessage('Falta el nombre.'); return; }
    const preds = Object.fromEntries(
      Object.entries(review.predictions)
        .filter(([, p]) => p.homeScore !== '' && p.awayScore !== '')
        .map(([id, p]) => [id, { homeScore: Number(p.homeScore), awayScore: Number(p.awayScore) }])
    );
    if (!Object.keys(preds).length) { setStatusMessage('Falta al menos un pronóstico.'); return; }
    setParticipants(prev => {
      const lower = name.toLowerCase();
      const origLower = review.originalName.toLowerCase();
      const filtered = prev.filter(p => p.name.toLowerCase() !== lower && (!origLower || p.name.toLowerCase() !== origLower));
      const existing = prev.find(p => p.name.toLowerCase() === lower || (origLower && p.name.toLowerCase() === origLower));
      return [...filtered, { ...(existing || {}), name, avatar: makeInitials(name), predictions: preds }];
    });
    setStatusMessage(`${name} guardado.`);
    setReview(emptyReview);
  };

  const addParticipant = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setParticipants(prev => [...prev.filter(p => p.name.toLowerCase() !== name.toLowerCase()), { name, avatar: makeInitials(name), predictions: {} }]);
    setNewName('');
  };

  const removeParticipant = (name) => setParticipants(prev => prev.filter(p => p.name !== name));

  const handlePhotoUpload = async (name, file) => {
    if (!file) return;
    try {
      setStatusMessage(`Procesando foto de ${name}…`);
      const photo = await resizeImageToDataUrl(file);
      setParticipants(prev => prev.map(p => p.name === name ? { ...p, photo } : p));
      setStatusMessage(`Foto de ${name} guardada.`);
    } catch (e) { setStatusMessage(`No pude procesar la foto: ${e.message}`); }
  };

  const removePhoto = (name) => setParticipants(prev => prev.map(p => { if (p.name !== name) return p; const n = { ...p }; delete n.photo; return n; }));
  const setTeam = (name, team) => setParticipants(prev => prev.map(p => { if (p.name !== name) return p; const n = { ...p }; if (team) n.team = team; else delete n.team; return n; }));
  const setEmail = (name, email) => setParticipants(prev => prev.map(p => p.name === name ? { ...p, email: email.trim().toLowerCase() } : p));
  const removeDocument = (id) => setDocuments(prev => prev.filter(d => d.id !== id));

  return (
    <AdminConsoleLayout activeSection={activeSection} onSelectSection={setActiveSection} session={session} onLogout={onLogout}>
      {activeSection === 'overview' && (
        <AdminOverview
          visitStats={visitStats} syncState={syncState} onSyncNow={onSyncNow}
          simActive={simActive} setSimActive={setSimActive} handleReset={handleReset} isSuper={isSuper}
        />
      )}
      {activeSection === 'quinielas' && (
        <AdminQuinielas
          review={review} setReview={setReview} reviewedPredictions={reviewedPredictions}
          onSaveReview={saveReview} onUpload={handleUpload} isAnalyzing={isAnalyzing} statusMessage={statusMessage}
          documents={documents} onRemoveDocument={removeDocument}
          apiKey={apiKey} onSaveApiKey={saveApiKey} keyVisible={keyVisible} setKeyVisible={setKeyVisible} isSuper={isSuper}
        />
      )}
      {activeSection === 'participants' && (
        <AdminParticipants
          participants={participants} matches={matches}
          onAdd={addParticipant} onRemove={removeParticipant} onEdit={editParticipant}
          onPhotoUpload={handlePhotoUpload} onRemovePhoto={removePhoto}
          onSetTeam={setTeam} onSetEmail={setEmail}
          newName={newName} setNewName={setNewName} statusMessage={statusMessage}
        />
      )}
      {activeSection === 'extension' && (
        <AdminPredictionExtension participants={participants} />
      )}
      {activeSection === 'notifications' && (
        <NotificationCenter isSuper={isSuper} session={session} />
      )}
      {activeSection === 'system' && (
        <AdminSystem isSuper={isSuper} />
      )}
    </AdminConsoleLayout>
  );
}
