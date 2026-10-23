/* Redimensiona fotografias no próprio telemóvel (canvas). Nada é enviado para fora. */

export const FULL_MAX = 1920; // lado maior da fotografia guardada
export const THUMB_MAX = 360; // lado maior da miniatura

export function fitSize(w, h, max) {
  const k = Math.min(1, max / Math.max(w, h));
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao codificar a imagem.'))), type, quality);
  });
}

/** Devolve { blob, w, h } em JPEG, com o lado maior limitado a `max`. */
export async function resizeBlob(blob, max, quality) {
  const { img, url } = await loadImage(blob);
  try {
    const [w, h] = fitSize(img.naturalWidth, img.naturalHeight, max);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return { blob: await canvasToBlob(canvas, 'image/jpeg', quality), w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function makeThumb(blob) {
  try {
    return (await resizeBlob(blob, THUMB_MAX, 0.7)).blob;
  } catch {
    return blob;
  }
}

/** Fotografia -> { blob, w, h, thumb }. Se a conversão falhar, guarda o original tal como está. */
export async function processImage(file) {
  try {
    const full = await resizeBlob(file, FULL_MAX, 0.85);
    const thumb = await makeThumb(full.blob);
    return { blob: full.blob, w: full.w, h: full.h, thumb };
  } catch {
    return { blob: file, w: 0, h: 0, thumb: file };
  }
}
