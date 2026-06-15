// Redimensiona y comprime una imagen en el navegador antes de guardarla.
// Las fotos viven en el estado compartido (JSON), así que conviene que sean ligeras:
// recortamos a un rectángulo vertical tipo cromito y exportamos JPEG.

const TARGET_W = 320;
const TARGET_H = 420; // proporción ~3:4, sticker vertical

export function resizeImageToDataUrl(file, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen.'));
      return;
    }

    // Red de seguridad: si algún callback nunca dispara, no dejamos la promesa colgada.
    let settled = false;
    const timer = setTimeout(() => finish(() => reject(new Error('La imagen tardó demasiado en procesarse.'))), 15000);
    const finish = (action) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    };

    const reader = new FileReader();
    reader.onerror = () => finish(() => reject(new Error('No pude leer la imagen.')));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => finish(() => reject(new Error('No pude procesar la imagen.')));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = TARGET_W;
        canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d');

        // "cover": llena el lienzo recortando el sobrante, centrado
        const scale = Math.max(TARGET_W / img.width, TARGET_H / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = (TARGET_W - drawW) / 2;
        const dy = (TARGET_H - drawH) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TARGET_W, TARGET_H);
        ctx.drawImage(img, dx, dy, drawW, drawH);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Ayuda al GC con imágenes grandes
          canvas.width = 0;
          canvas.height = 0;
          img.src = '';
          finish(() => resolve(dataUrl));
        } catch {
          finish(() => reject(new Error('No pude convertir la imagen.')));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
