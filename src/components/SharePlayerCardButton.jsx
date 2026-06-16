// Botones Compartir / Descargar de la ficha. La captura excluye estos botones
// (clase no-export) para que el PNG salga limpio, tipo cromo.
import { useState } from 'react';
import { Share2, Download } from 'lucide-react';
import { shareOrDownloadCard, exportCardPng, downloadDataUrl } from '../services/shareCard';

export default function SharePlayerCardButton({ cardRef, name }) {
  const [busy, setBusy] = useState(false);

  const run = async (mode) => {
    if (!cardRef?.current || busy) return;
    setBusy(true);
    try {
      if (mode === 'share') {
        await shareOrDownloadCard(cardRef.current, { name });
      } else {
        const url = await exportCardPng(cardRef.current);
        downloadDataUrl(url, `quiniela-mundial26-${String(name).toLowerCase().replace(/\s+/g, '-')}.png`);
      }
    } catch (error) {
      console.error('No pude generar la imagen de la ficha:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="share-actions no-export">
      <button type="button" className="share-btn" onClick={() => run('share')} disabled={busy}>
        <Share2 size={14} /> {busy ? 'Generando…' : 'Compartir'}
      </button>
      <button type="button" className="share-btn ghost" onClick={() => run('download')} disabled={busy}>
        <Download size={14} /> Descargar
      </button>
    </div>
  );
}
