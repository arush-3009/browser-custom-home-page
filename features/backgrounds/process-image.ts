import type { CustomBackgroundImage } from '../../types/domain';
import { nowIso } from '../../lib/utils/id';

const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const MAX_STORED_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 2560;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The processed image could not be read.'));
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('The processed image could not be encoded.'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Chrome could not process this image.')), 'image/webp', quality);
  });
}

export async function processCustomBackground(file: File): Promise<CustomBackgroundImage> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Choose an image smaller than 30 MB.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Chrome could not decode that image. Try a PNG, JPEG, or WebP file.');
  }
  try {
    if (bitmap.width < 800 || bitmap.height < 450) throw new Error('Choose an image at least 800 × 450 pixels for a crisp background.');
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Chrome could not prepare the background image.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, 0.88);
    if (blob.size > MAX_STORED_BYTES) blob = await canvasToBlob(canvas, 0.74);
    if (blob.size > MAX_STORED_BYTES) throw new Error('The processed image is still too large. Try a simpler or smaller photo.');

    return {
      dataUrl: await blobToDataUrl(blob),
      fileName: file.name.slice(0, 180) || 'Custom background',
      width,
      height,
      size: blob.size,
      updatedAt: nowIso(),
    };
  } finally {
    bitmap.close();
  }
}
