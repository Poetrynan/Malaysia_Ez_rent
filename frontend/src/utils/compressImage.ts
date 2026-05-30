export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
  /** Skip compression when file is already smaller than this (bytes) */
  skipBelowBytes?: number;
}

const DEFAULTS: Required<CompressImageOptions> = {
  maxWidth: 1600,
  maxHeight: 2400,
  quality: 0.82,
  mimeType: 'image/jpeg',
  skipBelowBytes: 180 * 1024,
};

/** Payment evidence screenshots — tall phone captures */
export const EVIDENCE_IMAGE_PRESET: CompressImageOptions = {
  maxWidth: 1080,
  maxHeight: 2400,
  quality: 0.8,
  mimeType: 'image/jpeg',
  skipBelowBytes: 150 * 1024,
};

/** Unit listing photos — JPEG, max 1920px; files under 250KB skip recompression */
export const UNIT_IMAGE_PRESET: CompressImageOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.88,
  mimeType: 'image/jpeg',
  skipBelowBytes: 250 * 1024,
};

/** Admin DuitNow QR — keep sharper, smaller dimensions */
export const QR_IMAGE_PRESET: CompressImageOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.92,
  mimeType: 'image/jpeg',
  skipBelowBytes: 120 * 1024,
};

/** REN tag license image — card-shaped, need readable text */
export const REN_TAG_PRESET: CompressImageOptions = {
  maxWidth: 1200,
  maxHeight: 800,
  quality: 0.88,
  mimeType: 'image/jpeg',
  skipBelowBytes: 150 * 1024,
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function scaleDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function compressImageToBlob(
  file: File,
  options: CompressImageOptions = {},
): Promise<Blob> {
  const cfg = { ...DEFAULTS, ...options };

  if (!file.type.startsWith('image/')) {
    return file;
  }
  if (file.size <= cfg.skipBelowBytes) {
    return file;
  }

  const img = await loadImageFromFile(file);
  const { width, height } = scaleDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    cfg.maxWidth,
    cfg.maxHeight,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Compression failed'))),
      cfg.mimeType,
      cfg.quality,
    );
  });

  // If compression somehow made it larger, keep original
  return blob.size < file.size ? blob : file;
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const cfg = { ...DEFAULTS, ...options };
  const blob = await compressImageToBlob(file, cfg);
  if (blob === file) return file;

  const ext = cfg.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.${ext}`, {
    type: cfg.mimeType,
    lastModified: Date.now(),
  });
}

export async function compressImageToDataUrl(
  file: File,
  options: CompressImageOptions = {},
): Promise<string> {
  const compressed = await compressImageFile(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

/** Compress a data-URL or remote http image before upload */
export async function compressDataUrl(
  dataUrl: string,
  options: CompressImageOptions = {},
): Promise<Blob> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
  return compressImageToBlob(file, options);
}
