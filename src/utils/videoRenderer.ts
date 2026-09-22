import { CameraMotionType } from '../types';

export interface RenderFrameOptions {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  progress: number; // 0.0 to 1.0 within the scene
  cameraMotion: CameraMotionType;
  captionText?: string;
  isRtl?: boolean;
  showVignette?: boolean;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export function renderCinematicFrame({
  canvas,
  image,
  progress,
  cameraMotion,
  captionText,
  isRtl = false,
  showVignette = true,
}: RenderFrameOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Compute camera motion transform
  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;

  switch (cameraMotion) {
    case 'Cinematic Zoom In':
      scale = 1.05 + progress * 0.18;
      break;
    case 'Dramatic Zoom Out':
      scale = 1.25 - progress * 0.2;
      break;
    case 'Pan Left to Right':
      scale = 1.15;
      offsetX = (progress - 0.5) * w * 0.12;
      break;
    case 'Pan Right to Left':
      scale = 1.15;
      offsetX = (0.5 - progress) * w * 0.12;
      break;
    case 'Dynamic Drone Sweep':
      scale = 1.08 + progress * 0.12;
      offsetY = (progress - 0.5) * h * 0.08;
      offsetX = Math.sin(progress * Math.PI) * w * 0.03;
      break;
    case 'Slow Orbiting 360':
      scale = 1.12 + Math.sin(progress * Math.PI) * 0.05;
      rotation = (progress - 0.5) * 0.03;
      break;
    case 'Low Angle Tilt Up':
      scale = 1.14;
      offsetY = (progress - 0.5) * h * 0.1;
      break;
    case 'Slow Motion 120fps':
      scale = 1.06 + progress * 0.05;
      break;
    case 'Static Focused Depth':
    default:
      scale = 1.04;
      break;
  }

  // Draw image with transform centered
  ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.scale(scale, scale);

  // Cover aspect ratio
  const imgAspect = image.naturalWidth / image.naturalHeight;
  const canvasAspect = w / h;
  let drawW = w;
  let drawH = h;

  if (imgAspect > canvasAspect) {
    drawH = h;
    drawW = h * imgAspect;
  } else {
    drawW = w;
    drawH = w / imgAspect;
  }

  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Cinematic Vignette overlay
  if (showVignette) {
    const gradient = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.35,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  // Subtle Letterbox / Cinema bars if 16:9
  const barHeight = h * 0.035;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, barHeight);
  ctx.fillRect(0, h - barHeight, w, barHeight);

  // Subtitle / Caption rendering
  if (captionText && captionText.trim()) {
    ctx.save();
    const fontSize = Math.max(16, Math.floor(w * 0.028));
    ctx.font = `600 ${fontSize}px ${isRtl ? "'Noto Nastaliq Urdu', 'Plus Jakarta Sans', sans-serif" : "'Plus Jakarta Sans', sans-serif"}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.direction = isRtl ? 'rtl' : 'ltr';

    const textY = h - barHeight - 18;
    const maxWidth = w * 0.85;

    // Word wrap captions
    const words = captionText.split(' ');
    let currentLine = '';
    const lines: string[] = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Draw caption backdrop pill
    const lineHeight = fontSize * 1.35;
    const totalCaptionHeight = lines.length * lineHeight;
    const startY = textY - totalCaptionHeight + lineHeight;

    lines.forEach((line, i) => {
      const lineY = startY + i * lineHeight;
      const metrics = ctx.measureText(line);
      const bgPadX = 14;
      const bgPadY = 4;

      ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
      ctx.beginPath();
      ctx.roundRect(
        w / 2 - metrics.width / 2 - bgPadX,
        lineY - fontSize - bgPadY,
        metrics.width + bgPadX * 2,
        fontSize + bgPadY * 2,
        6
      );
      ctx.fill();

      // Text stroke
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(line, w / 2, lineY);

      // Text fill
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, w / 2, lineY);
    });

    ctx.restore();
  }
}

/**
 * Record canvas to a downloadable video file (WebM / MP4)
 */
export async function recordCanvasToVideo(
  canvas: HTMLCanvasElement,
  drawCallback: (progress: number) => void,
  durationSeconds: number,
  fps: number = 30,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(fps);
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = '';
    }

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      resolve(blob);
    };

    recorder.onerror = (e) => reject(e);

    recorder.start(100);

    const totalFrames = Math.floor(durationSeconds * fps);
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      drawCallback(Math.min(progress, 1.0));
      if (onProgress) onProgress(progress);

      if (frame >= totalFrames) {
        clearInterval(interval);
        setTimeout(() => {
          recorder.stop();
        }, 200);
      }
    }, 1000 / fps);
  });
}
