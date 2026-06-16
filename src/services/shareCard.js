// Exporta la ficha del jugador como PNG (cromo coleccionable) usando
// html-to-image. Excluye los elementos con clase `no-export` (botones, cerrar).
import { toPng } from 'html-to-image';

export async function exportCardPng(node, { pixelRatio = 2 } = {}) {
  if (!node) throw new Error('No hay nodo para exportar.');
  const rect = node.getBoundingClientRect();

  // 1) Asegura que las fuentes (Barlow) estén listas antes de capturar.
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* noop */ }

  // 2) Congela animaciones (entrada, brillo, sweep) para no capturar un fotograma a medias.
  node.classList.add('is-exporting');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    return await toPng(node, {
      pixelRatio,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      // OJO: sin cacheBust — corrompe las fotos en data URL (les añade query y revientan).
      // skipFonts: evita que intente leer/embeber la hoja cross-origin de Google Fonts,
      // que es lo que lanzaba el error "Event" (usa la tipografía del sistema en el PNG).
      skipFonts: true,
      backgroundColor: '#f6f8fb',
      style: {
        margin: '0',
        transform: 'none',
        opacity: '1'
      },
      filter: (el) => !(el.classList && el.classList.contains('no-export'))
    });
  } finally {
    node.classList.remove('is-exporting');
  }
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
