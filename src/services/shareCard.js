// Exporta la ficha del jugador como PNG (cromo coleccionable) usando
// html-to-image. Excluye los elementos con clase `no-export` (botones, cerrar).
import { toPng } from 'html-to-image';

export async function exportCardPng(node, { pixelRatio = 3 } = {}) {
  return toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: null,
    filter: (el) => !(el.classList && el.classList.contains('no-export'))
  });
}

export function downloadDataUrl(dataUrl, fileName) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function slug(name) {
  return String(name || 'ficha').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Comparte con la Web Share API (móvil) si hay soporte de archivos; si no, descarga.
export async function shareOrDownloadCard(node, { name } = {}) {
  const fileName = `quiniela-mundial26-${slug(name)}.png`;
  const dataUrl = await exportCardPng(node);

  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Ficha de ${name} · Quiniela Mundial 26` });
      return 'shared';
    }
  } catch {
    /* sin Web Share: caemos a descarga */
  }

  downloadDataUrl(dataUrl, fileName);
  return 'downloaded';
}
