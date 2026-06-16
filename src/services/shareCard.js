// Exporta la ficha del jugador como PNG (cromo coleccionable) usando
// html-to-image. Excluye los elementos con clase `no-export` (botones, cerrar).
import { toPng } from 'html-to-image';

async function prepareImagesForExport(node) {
  const cleanups = [];
  const images = Array.from(node.querySelectorAll('img'));

  await Promise.all(images.map(async (img) => {
    try {
      if (img.decode) await img.decode();
      if (!img.complete || !img.naturalWidth || !img.naturalHeight) return;

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const originalSrc = img.getAttribute('src');
      const originalSrcset = img.getAttribute('srcset');
      const dataUrl = canvas.toDataURL('image/png');

      img.removeAttribute('srcset');
      img.setAttribute('src', dataUrl);
      cleanups.push(() => {
        if (originalSrcset) img.setAttribute('srcset', originalSrcset);
        else img.removeAttribute('srcset');
        if (originalSrc) img.setAttribute('src', originalSrc);
      });

      canvas.width = 0;
      canvas.height = 0;
    } catch {
      // Si una imagen no se puede rehidratar, dejamos que html-to-image use el src original.
    }
  }));

  return () => cleanups.forEach(cleanup => cleanup());
}

export async function exportCardPng(node, { pixelRatio = 2 } = {}) {
  if (!node) throw new Error('No hay nodo para exportar.');
  const rect = node.getBoundingClientRect();
  let restoreImages;

  // 1) Asegura que las fuentes (Barlow) estén listas antes de capturar.
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* noop */ }

  // 2) Congela animaciones y prepara fotos para que el clon de html-to-image no las pierda.
  node.classList.add('is-exporting');
  restoreImages = await prepareImagesForExport(node);
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
    if (restoreImages) restoreImages();
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
