// ==========================================================================
// Compresión de imágenes en el cliente antes de mandarlas a analizar.
// Reduce el tamaño para que la subida sea rápida y barata.
// ==========================================================================

const MAX_DIMENSION = 1600; // px del lado más largo
const QUALITY = 0.72;

// Google Sheets limita cada celda a 50.000 caracteres. Dejamos margen.
const CELL_CHAR_LIMIT = 48000;

export async function compressImage(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  return scaleToDataUrl(img, MAX_DIMENSION, QUALITY) ?? dataUrl;
}

/**
 * Comprime una imagen lo suficiente para que su data URL entre en una celda
 * de Google Sheets. Baja dimensión y calidad de forma progresiva hasta lograrlo.
 * Pensada para el "modo rápido": una miniatura legible, no una foto en alta.
 */
export async function compressImageToLimit(
  file: File,
  maxChars = CELL_CHAR_LIMIT
): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const dims = [1000, 800, 640, 480, 360];
  const qualities = [0.6, 0.5, 0.4, 0.32];

  let smallest = dataUrl;
  for (const dim of dims) {
    for (const q of qualities) {
      const out = scaleToDataUrl(img, dim, q);
      if (!out) continue;
      if (out.length <= maxChars) return out;
      smallest = out; // vamos guardando el más chico que logramos
    }
  }
  // El último intento (360px, 0.32) es el más agresivo: casi siempre entra.
  return smallest;
}

/** Escala la imagen a `maxDim` (lado más largo) y devuelve un JPEG data URL. */
function scaleToDataUrl(
  img: HTMLImageElement,
  maxDim: number,
  quality: number
): string | null {
  let { width, height } = img;
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height >= width && height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
    img.src = src;
  });
}
