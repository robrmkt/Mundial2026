// Lectura inteligente de quinielas con OpenAI.
// La API key se guarda en localStorage (herramienta interna de oficina).
// PDF: el texto se extrae en el navegador con pdf.js (cargado en index.html)
// y se manda a OpenAI solo como texto, junto con la lista oficial de partidos.

const KEY_STORAGE = 'quiniela_openai_key';

export function getOpenAiKey() {
  try {
    return window.localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setOpenAiKey(key) {
  try {
    if (key) window.localStorage.setItem(KEY_STORAGE, key.trim());
    else window.localStorage.removeItem(KEY_STORAGE);
  } catch {
    // sin almacenamiento disponible
  }
}

export async function extractPdfText(file) {
  if (!window.pdfjsLib) throw new Error('pdf.js no está disponible (revisa tu conexión).');
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  return pages.join('\n');
}

export async function analyzeTextWithOpenAI(text, matches, apiKey) {
  const matchList = matches
    .map(m => `${m.id}: ${m.homeTeam} vs ${m.awayTeam} (${m.date})`)
    .join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que interpreta quinielas del Mundial 2026 enviadas por colaboradores de una oficina. ' +
            'Recibes el texto crudo de un documento y la lista oficial de partidos con su id. ' +
            'Devuelve SOLO un JSON con esta forma: {"participantName": string (vacío si no aparece el nombre de la persona), ' +
            '"predictions": [{"matchId": number, "homeScore": number, "awayScore": number}]}. ' +
            'Asocia cada pronóstico al id correcto comparando los nombres de los equipos (pueden venir con errores ortográficos o en otro orden). ' +
            'El primer número siempre corresponde al equipo local del partido oficial. Ignora marcadores que no puedas asociar con confianza.'
        },
        {
          role: 'user',
          content: `LISTA OFICIAL DE PARTIDOS:\n${matchList}\n\nDOCUMENTO DEL COLABORADOR:\n${text.slice(0, 24000)}`
        }
      ]
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI respondió ${res.status}. ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

  const validIds = new Set(matches.map(m => m.id));
  const predictions = {};
  (parsed.predictions || []).forEach(p => {
    const id = Number(p.matchId);
    const home = Number(p.homeScore);
    const away = Number(p.awayScore);
    if (validIds.has(id) && Number.isInteger(home) && Number.isInteger(away) && home >= 0 && away >= 0) {
      predictions[id] = { homeScore: home, awayScore: away };
    }
  });

  return {
    participantName: String(parsed.participantName || '').trim(),
    predictions
  };
}
