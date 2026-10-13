import { VideoProject, Scene, CaptionStyle, VisualEffect } from '../types/editor';
import { AudioEngine } from './audioEngine';

/**
 * Preload HTMLImageElement map for smooth canvas rendering
 */
export async function preloadProjectImages(scenes: Scene[]): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  const promises = scenes.map((scene) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        map.set(scene.imageUrl, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load image for scene ${scene.sceneNumber}: ${scene.imageUrl}`);
        resolve();
      };
      img.src = scene.imageUrl;
    });
  });
  await Promise.all(promises);
  return map;
}

/**
 * Render a single frame of the video onto an HTML5 2D Canvas
 */
export function renderVideoFrame(
  ctx: CanvasRenderingContext2D,
  project: VideoProject,
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number,
  imageCache: Map<string, HTMLImageElement>
) {
  // Clear canvas
  ctx.fillStyle = '#08090C';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const scenes = project.scenes;
  if (!scenes || scenes.length === 0) return;

  const totalDuration = scenes[scenes.length - 1]?.endTime || 10;
  const clampedTime = Math.max(0, Math.min(currentTime, totalDuration));

  // Find active scene
  let sceneIndex = scenes.findIndex(
    (s) => clampedTime >= s.startTime && clampedTime < s.endTime
  );
  if (sceneIndex === -1) {
    sceneIndex = clampedTime >= totalDuration ? scenes.length - 1 : 0;
  }

  const currentScene = scenes[sceneIndex];
  if (!currentScene) return;

  const sceneProgress = Math.max(
    0,
    Math.min(1, (clampedTime - currentScene.startTime) / (currentScene.duration || 1))
  );

  // Transition handling (last 0.45s)
  const timeRemainingInScene = currentScene.endTime - clampedTime;
  const transitionDuration = 0.45;
  const isTransitioning =
    timeRemainingInScene < transitionDuration &&
    sceneIndex < scenes.length - 1 &&
    currentScene.transition !== 'none';

  // 1. Draw current scene image with Ken Burns effect & Visual Filters
  drawSceneImage(
    ctx,
    currentScene,
    sceneProgress,
    canvasWidth,
    canvasHeight,
    imageCache,
    1.0
  );

  // 2. Transition overlay if in transition window
  if (isTransitioning) {
    const nextScene = scenes[sceneIndex + 1];
    const transitionProgress = 1 - timeRemainingInScene / transitionDuration; // 0 to 1

    if (currentScene.transition === 'flash_white') {
      // White dip flash
      const flashAlpha = Math.sin(transitionProgress * Math.PI) * 0.85;
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    } else if (currentScene.transition === 'crossfade' || currentScene.transition === 'blur_dissolve') {
      // Crossfade / dissolve
      drawSceneImage(
        ctx,
        nextScene,
        transitionProgress * 0.1,
        canvasWidth,
        canvasHeight,
        imageCache,
        transitionProgress
      );
    } else if (currentScene.transition === 'slide') {
      // Slide from right
      ctx.save();
      ctx.translate(canvasWidth * (1 - transitionProgress), 0);
      drawSceneImage(
        ctx,
        nextScene,
        0,
        canvasWidth,
        canvasHeight,
        imageCache,
        1.0
      );
      ctx.restore();
    }
  }

  // 3. Cinematic Vignette
  drawCinematicVignette(ctx, canvasWidth, canvasHeight);

  // 4. Render Active AI Dynamic Captions (ONLY if enabled)
  if (project.captionStyle && project.captionStyle.enabled) {
    drawCaptions(
      ctx,
      project,
      currentScene,
      clampedTime,
      canvasWidth,
      canvasHeight,
      project.captionStyle
    );
  }
}

function drawSceneImage(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  progress: number,
  cw: number,
  ch: number,
  imageCache: Map<string, HTMLImageElement>,
  alpha: number = 1.0
) {
  const img = imageCache.get(scene.imageUrl);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Compute Ken Burns scale and translation
  let scale = 1.08;
  let offsetX = 0;
  let offsetY = 0;

  switch (scene.kenBurns) {
    case 'zoom-in':
      scale = 1.02 + progress * 0.14;
      break;
    case 'zoom-out':
      scale = 1.16 - progress * 0.14;
      break;
    case 'pan-left':
      scale = 1.12;
      offsetX = (0.5 - progress) * (cw * 0.06);
      break;
    case 'pan-right':
      scale = 1.12;
      offsetX = (progress - 0.5) * (cw * 0.06);
      break;
    case 'float':
      scale = 1.06 + Math.sin(progress * Math.PI) * 0.04;
      offsetY = Math.sin(progress * Math.PI * 2) * (ch * 0.02);
      break;
    default:
      scale = 1.04;
  }

  // Center transformation
  ctx.translate(cw / 2 + offsetX, ch / 2 + offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-cw / 2, -ch / 2);

  // Apply visual filter
  applyVisualFilter(ctx, scene.visualEffect || 'none');

  if (img && img.complete && img.naturalWidth > 0) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;
    let renderW = cw;
    let renderH = ch;
    let renderX = 0;
    let renderY = 0;

    if (imgRatio > canvasRatio) {
      renderH = ch;
      renderW = ch * imgRatio;
      renderX = (cw - renderW) / 2;
    } else {
      renderW = cw;
      renderH = cw / imgRatio;
      renderY = (ch - renderH) / 2;
    }

    ctx.drawImage(img, renderX, renderY, renderW, renderH);
  } else {
    // Elegant fallback canvas
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Scene ${scene.sceneNumber}: ${scene.title}`, cw / 2, ch / 2);
  }

  ctx.restore();
}

function applyVisualFilter(ctx: CanvasRenderingContext2D, effect: VisualEffect) {
  switch (effect) {
    case 'cinematic':
      ctx.filter = 'contrast(120%) saturate(115%) brightness(95%)';
      break;
    case 'warm_film':
      ctx.filter = 'sepia(25%) saturate(120%) brightness(102%) contrast(105%)';
      break;
    case 'moody_cold':
      ctx.filter = 'hue-rotate(185deg) saturate(90%) contrast(115%) brightness(90%)';
      break;
    case 'noir':
      ctx.filter = 'grayscale(100%) contrast(135%) brightness(95%)';
      break;
    case 'cyberpunk':
      ctx.filter = 'hue-rotate(280deg) saturate(140%) contrast(125%)';
      break;
    case 'vintage':
      ctx.filter = 'sepia(40%) contrast(90%) brightness(105%)';
      break;
    case 'vignette':
      ctx.filter = 'contrast(110%) brightness(98%)';
      break;
    default:
      ctx.filter = 'none';
  }
}

function drawCinematicVignette(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  const gradient = ctx.createRadialGradient(
    cw / 2,
    ch / 2,
    Math.min(cw, ch) * 0.35,
    cw / 2,
    ch / 2,
    Math.max(cw, ch) * 0.72
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
  gradient.addColorStop(0.65, 'rgba(0, 0, 0, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cw, ch);

  // Bottom subtitle darkness gradient for caption readability
  const bottomGradient = ctx.createLinearGradient(0, ch * 0.65, 0, ch);
  bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, ch * 0.65, cw, ch * 0.35);

  ctx.restore();
}

/**
 * Dynamic Subtitles Rendering (20+ styles, manual color, stroke, background pill, font size)
 */
function drawCaptions(
  ctx: CanvasRenderingContext2D,
  project: VideoProject,
  scene: Scene,
  currentTime: number,
  cw: number,
  ch: number,
  style: CaptionStyle
) {
  // If user disabled captions or no text, return immediately
  if (!style.enabled) return;

  let captionText = '';
  let activeRelativeStart = 0;

  // 1. Check dedicated timeline captions first
  if (project.timelineCaptions && project.timelineCaptions.length > 0) {
    const activeTimelineCap = project.timelineCaptions.find(
      (tc) => currentTime >= tc.startTime && currentTime < tc.endTime
    );
    if (activeTimelineCap) {
      captionText = activeTimelineCap.text;
      activeRelativeStart = activeTimelineCap.startTime;
    }
  }

  // 2. Fallback to scene-level captions
  if (!captionText) {
    const relativeTime = currentTime - scene.startTime;
    const captions = scene.captions || [];

    const activeCap = captions.find(
      (c) => relativeTime >= c.relativeStart && relativeTime < c.relativeStart + c.duration
    );

    captionText = activeCap ? activeCap.text : '';
    if (activeCap) activeRelativeStart = activeCap.relativeStart;
  }

  // 3. Fallback to scene narration
  if (!captionText && scene.narration) {
    captionText = scene.narration;
  }

  if (!captionText || captionText.trim().length === 0) return;

  if (style.uppercase) {
    captionText = captionText.toUpperCase();
  }

  // Vertical Position calculation
  const yPercent = (style.yOffsetPercent || 82) / 100;
  let yPos = ch * yPercent;
  if (style.position === 'center') yPos = ch * 0.5;
  if (style.position === 'top') yPos = ch * 0.18;

  // Font Size
  const baseSize = ch * 0.046;
  let fontSizePx = baseSize;
  if (style.fontSize === 'sm') fontSizePx = baseSize * 0.75;
  if (style.fontSize === 'md') fontSizePx = baseSize * 0.95;
  if (style.fontSize === 'lg') fontSizePx = baseSize * 1.2;
  if (style.fontSize === 'xl') fontSizePx = baseSize * 1.45;
  if (style.fontSize === '2xl') fontSizePx = baseSize * 1.7;

  const fontFam = style.fontFamily || 'Cabinet Grotesk';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Animation pulse (pop when caption begins)
  let scaleFactor = 1.0;
  if (style.animation === 'pop') {
    const chunkAge = (currentTime - scene.startTime) - activeRelativeStart;
    if (chunkAge >= 0 && chunkAge < 0.16) {
      scaleFactor = 1.0 + Math.sin((chunkAge / 0.16) * Math.PI) * 0.14;
    }
  } else if (style.animation === 'bounce') {
    const chunkAge = (currentTime - scene.startTime) - activeRelativeStart;
    if (chunkAge >= 0 && chunkAge < 0.22) {
      scaleFactor = 1.0 + Math.sin((chunkAge / 0.22) * Math.PI * 1.5) * 0.18;
    }
  }

  ctx.translate(cw / 2, yPos);
  ctx.scale(scaleFactor, scaleFactor);

  ctx.font = `900 ${Math.round(fontSizePx)}px '${fontFam}', Inter, Montserrat, sans-serif`;

  // Draw background pill / box if opacity > 0
  if (style.backgroundOpacity > 0 && style.backgroundColor && style.backgroundColor !== 'transparent') {
    const textMetrics = ctx.measureText(captionText);
    const pad = style.boxPadding || 12;
    const boxWidth = textMetrics.width + pad * 3.5;
    const boxHeight = fontSizePx * 1.7;

    ctx.save();
    ctx.globalAlpha = style.backgroundOpacity;
    ctx.fillStyle = style.backgroundColor;
    roundRect(ctx, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.restore();
  }

  // Shadow / Glow
  if (style.glow && style.glowColor) {
    ctx.shadowColor = style.glowColor;
    ctx.shadowBlur = 24;
  } else if (style.shadow) {
    ctx.shadowColor = style.shadowColor || 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
  }

  // Stroke / Outline
  if (style.strokeWidth > 0 && style.strokeColor && style.strokeColor !== 'transparent') {
    ctx.lineWidth = style.strokeWidth;
    ctx.strokeStyle = style.strokeColor;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 3;
    ctx.strokeText(captionText, 0, 0);
  }

  // Main text fill with custom highlight / text color
  ctx.shadowBlur = 0;
  ctx.fillStyle = style.highlightColor || style.textColor || '#FFE600';
  ctx.fillText(captionText, 0, 0);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Export full video with Canvas rendering + Web Audio mixer + MediaRecorder
 */
export async function exportVideoFile(
  project: VideoProject,
  audioEngine: AudioEngine,
  onProgress: (progress: number, statusText: string) => void,
  onCancelCheck: () => boolean
): Promise<Blob> {
  const isLandscape = project.aspectRatio === '16:9';
  const width = isLandscape ? 1920 : 1080;
  const height = isLandscape ? 1080 : 1920;

  onProgress(5, 'Preloading scene visuals...');
  const imageCache = await preloadProjectImages(project.scenes);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not create Canvas 2D context.');

  const totalDuration = project.scenes[project.scenes.length - 1]?.endTime || 10;
  const fps = 30;
  const totalFrames = Math.ceil(totalDuration * fps);

  const canvasStream = canvas.captureStream(fps);
  const audioStreamNode = audioEngine.getMediaStreamDestination();

  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
  audioStreamNode.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));

  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 8000000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      audioEngine.pause();
      const finalBlob = new Blob(recordedChunks, { type: mimeType });
      resolve(finalBlob);
    };

    recorder.onerror = (e) => {
      audioEngine.pause();
      reject(e);
    };

    recorder.start(100);
    audioEngine.seek(0, true, !!project.audio.musicCustomUrl);

    onProgress(10, 'Encoding frames & audio...');

    let currentFrame = 0;
    const intervalMs = 1000 / fps;

    const renderLoop = () => {
      if (onCancelCheck()) {
        recorder.stop();
        audioEngine.pause();
        reject(new Error('Export cancelled.'));
        return;
      }

      if (currentFrame >= totalFrames) {
        onProgress(100, 'Finalizing video file...');
        recorder.stop();
        return;
      }

      const currentTime = currentFrame / fps;
      renderVideoFrame(ctx, project, currentTime, width, height, imageCache);

      currentFrame++;
      const pct = Math.round(10 + (currentFrame / totalFrames) * 88);
      onProgress(pct, `Rendering frame ${currentFrame}/${totalFrames} (${Math.round(currentTime)}s / ${Math.round(totalDuration)}s)...`);

      setTimeout(renderLoop, intervalMs);
    };

    renderLoop();
  });
}

/**
 * Generate standard SRT subtitle file text for YouTube upload
 */
export function generateSRTSubtitles(project: VideoProject): string {
  let srt = '';
  let counter = 1;

  const formatSRTTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  if (project.timelineCaptions && project.timelineCaptions.length > 0) {
    project.timelineCaptions.forEach((cap) => {
      srt += `${counter}\n`;
      srt += `${formatSRTTime(cap.startTime)} --> ${formatSRTTime(cap.endTime)}\n`;
      srt += `${cap.text}\n\n`;
      counter++;
    });
    return srt;
  }

  project.scenes.forEach((scene) => {
    if (scene.captions && scene.captions.length > 0) {
      scene.captions.forEach((cap) => {
        const start = scene.startTime + cap.relativeStart;
        const end = start + cap.duration;
        srt += `${counter}\n`;
        srt += `${formatSRTTime(start)} --> ${formatSRTTime(end)}\n`;
        srt += `${cap.text}\n\n`;
        counter++;
      });
    } else {
      srt += `${counter}\n`;
      srt += `${formatSRTTime(scene.startTime)} --> ${formatSRTTime(scene.endTime)}\n`;
      srt += `${scene.narration}\n\n`;
      counter++;
    }
  });

  return srt;
}
