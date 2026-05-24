export interface CompressVideoOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** Target video bitrate (bits per second) */
  videoBitsPerSecond?: number;
  /** Skip re-encode when file is already smaller than this */
  skipBelowBytes?: number;
  /** Preferred output MIME (WebM — browser MediaRecorder native output) */
  mimeType?: string;
}

export const UNIT_VIDEO_PRESET: CompressVideoOptions = {
  maxWidth: 1280,
  maxHeight: 720,
  videoBitsPerSecond: 1_200_000,
  skipBelowBytes: 12 * 1024 * 1024,
  mimeType: 'video/webm;codecs=vp9',
};

function pickRecorderMime(preferred?: string): string {
  const candidates = [
    preferred,
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].filter(Boolean) as string[];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

function scaleVideoDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(2, Math.round(width * ratio)),
    height: Math.max(2, Math.round(height * ratio)),
  };
}

function waitForEvent(target: EventTarget, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => { cleanup(); resolve(); };
    const onErr = () => { cleanup(); reject(new Error('Video processing failed')); };
    const cleanup = () => {
      target.removeEventListener(event, onOk);
      target.removeEventListener('error', onErr);
    };
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener('error', onErr, { once: true });
  });
}

/**
 * Re-encode video in the browser via canvas + MediaRecorder (WebM output).
 * Falls back to the original file when compression is unavailable or ineffective.
 */
export async function compressVideoFile(
  file: File,
  options: CompressVideoOptions = {},
): Promise<File> {
  const cfg = { ...UNIT_VIDEO_PRESET, ...options };

  if (!file.type.startsWith('video/')) return file;
  if (file.size <= (cfg.skipBelowBytes ?? UNIT_VIDEO_PRESET.skipBelowBytes!)) {
    return file;
  }
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    await waitForEvent(video, 'loadedmetadata');
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) return file;

    const { width, height } = scaleVideoDimensions(
      srcW,
      srcH,
      cfg.maxWidth ?? 1280,
      cfg.maxHeight ?? 720,
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const mimeType = pickRecorderMime(cfg.mimeType);
    const stream = canvas.captureStream(24);
    const chunks: Blob[] = [];

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: cfg.videoBitsPerSecond ?? 1_200_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = () => reject(new Error('MediaRecorder failed'));
    });

    recorder.start(250);
    video.currentTime = 0;

    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error('Video playback failed'));
      const draw = () => {
        if (video.ended) return;
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(draw);
      };
      draw();
      void video.play();
    });

    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await recorded;

    if (!blob.size || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'video';
    return new File([blob], `${baseName}.webm`, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch (e) {
    console.warn('[compressVideo] fallback to original:', e);
    return file;
  } finally {
    video.pause();
    URL.revokeObjectURL(objectUrl);
  }
}
