import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoProject, Scene } from '../../types/editor';
import { AudioEngine } from '../../services/audioEngine';
import { preloadProjectImages, renderVideoFrame } from '../../services/videoExporter';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Repeat,
  Sparkles,
  Tv,
} from 'lucide-react';

interface CapCutMonitorProps {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlay: () => void;
  audioEngine: AudioEngine;
}

export const CapCutMonitor: React.FC<CapCutMonitorProps> = ({
  project,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onTogglePlay,
  audioEngine,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Performance-critical refs to decouple 60 FPS animation loop from React re-renders
  const currentTimeRef = useRef<number>(currentTime);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const projectRef = useRef<VideoProject>(project);
  const lastStateUpdateTimeRef = useRef<number>(0);

  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const hudTimeoutRef = useRef<number | null>(null);

  // Sync refs with latest props without restarting animation loop
  currentTimeRef.current = currentTime;
  isPlayingRef.current = isPlaying;
  projectRef.current = project;

  const totalDuration = project.scenes[project.scenes.length - 1]?.endTime || 10;
  const isLandscape = project.aspectRatio === '16:9';

  // Preload project images into cache
  useEffect(() => {
    preloadProjectImages(project.scenes).then((map) => {
      imageCacheRef.current = map;
      // Trigger instant repaint
      drawCurrentFrame();
    });
  }, [project.scenes]);

  // Direct canvas paint helper
  const drawFrameToCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, time: number) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderVideoFrame(
        ctx,
        projectRef.current,
        time,
        canvas.width,
        canvas.height,
        imageCacheRef.current
      );
    },
    []
  );

  const drawCurrentFrame = useCallback(() => {
    drawFrameToCanvas(canvasRef.current, currentTimeRef.current);
    if (isFullscreen) {
      drawFrameToCanvas(fullscreenCanvasRef.current, currentTimeRef.current);
    }
  }, [drawFrameToCanvas, isFullscreen]);

  // Repaint canvas when scrubbing or paused and currentTime changes
  useEffect(() => {
    if (!isPlaying) {
      drawCurrentFrame();
    }
  }, [currentTime, isPlaying, drawCurrentFrame]);

  // High-performance 60 FPS Animation Loop
  // NOTE: currentTime is NOT in dependency array so loop runs buttery smooth with zero stutter!
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Advance internal microsecond-accurate time
      let nextTime = currentTimeRef.current + dt;

      if (nextTime >= totalDuration) {
        if (isLooping) {
          nextTime = 0;
          currentTimeRef.current = 0;
          audioEngine.seek(0, true, !!projectRef.current.audio.musicCustomUrl);
          onTimeUpdate(0);
        } else {
          nextTime = totalDuration;
          currentTimeRef.current = totalDuration;
          onTimeUpdate(totalDuration);
          onTogglePlay();
          drawCurrentFrame();
          return;
        }
      }

      currentTimeRef.current = nextTime;

      // Broadcast smooth microsecond time event for timeline needle (60 FPS, zero React re-render overhead)
      window.dispatchEvent(
        new CustomEvent('editor:smooth-time', { detail: { time: nextTime } })
      );

      // Render video frame on canvas at 60 FPS
      drawFrameToCanvas(canvasRef.current, nextTime);
      if (fullscreenCanvasRef.current) {
        drawFrameToCanvas(fullscreenCanvasRef.current, nextTime);
      }

      // Throttle React state update to ~20 FPS (every 50ms) to keep CPU free and UI snappy
      if (now - lastStateUpdateTimeRef.current > 48) {
        lastStateUpdateTimeRef.current = now;
        onTimeUpdate(nextTime);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    isPlaying,
    totalDuration,
    isLooping,
    onTimeUpdate,
    onTogglePlay,
    audioEngine,
    drawFrameToCanvas,
    drawCurrentFrame,
  ]);

  // Fullscreen keyboard shortcuts: F = toggle fullscreen, Esc = close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'f' || e.key === 'F') &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Reset HUD auto-hide timer in fullscreen
  const handleMouseMove = () => {
    setShowHud(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = window.setTimeout(() => {
      if (isPlayingRef.current) {
        setShowHud(false);
      }
    }, 2500);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, newTime));
    currentTimeRef.current = clamped;
    onTimeUpdate(clamped);
    audioEngine.seek(clamped, isPlaying, !!project.audio.musicCustomUrl);
    drawFrameToCanvas(canvasRef.current, clamped);
    if (fullscreenCanvasRef.current) {
      drawFrameToCanvas(fullscreenCanvasRef.current, clamped);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0C11] overflow-hidden min-h-0 relative select-none">
      {/* Monitor Top Spec Strip */}
      <div className="h-8 px-4 bg-[#111319] border-b border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400 select-none shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-gray-200">Player Monitor</span>
          <span className="text-gray-700">·</span>
          <span className="text-cyan-400 font-mono text-[10px]">
            {isLandscape ? '1920 × 1080 (16:9 FHD)' : '1080 × 1920 (9:16 Shorts)'}
          </span>
          <span className="text-gray-700">·</span>
          <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 px-1 rounded border border-emerald-800/40">
            60 FPS Smooth
          </span>
        </div>

        <div className="flex items-center space-x-3 font-mono text-gray-300">
          <div className="flex items-center space-x-1">
            <span className="text-white font-bold">{formatTime(currentTime)}</span>
            <span className="text-gray-600">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1 hover:text-cyan-400 text-gray-400 rounded transition flex items-center gap-1 font-sans text-[10px] font-bold"
            title="Fullscreen Cinema Preview (Press F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Screen */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-3 relative group overflow-hidden bg-black/90 select-none min-h-0"
      >
        <div
          className={`relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black max-w-full max-h-full ${
            isLandscape ? 'aspect-video w-full max-w-[820px]' : 'aspect-[9/16] h-full max-h-[440px]'
          }`}
        >
          <canvas
            ref={canvasRef}
            width={isLandscape ? 1920 : 1080}
            height={isLandscape ? 1080 : 1920}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onTogglePlay}
          />

          {/* Center Play Overlay Icon when Paused */}
          {!isPlaying && (
            <div
              onClick={onTogglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] cursor-pointer group-hover:bg-black/35 transition"
            >
              <div className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-2xl shadow-cyan-500/40 transform hover:scale-110 active:scale-95 transition">
                <Play className="w-6 h-6 ml-1 fill-black" />
              </div>
            </div>
          )}

          {/* Quick Corner Fullscreen Trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-cyan-500 hover:text-black text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition shadow"
            title="Fullscreen Preview"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Transport Bar */}
      <div className="h-10 px-4 bg-[#111319] border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-300 select-none shrink-0">
        {/* Left: Transport buttons */}
        <div className="flex items-center space-x-2">
          {/* Restart */}
          <button
            onClick={() => handleSeek(0)}
            className="p-1.5 hover:text-white text-gray-400 rounded-lg hover:bg-gray-800 transition"
            title="Restart from beginning (Home)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Step Back 5s */}
          <button
            onClick={() => handleSeek(currentTime - 5)}
            className="p-1.5 hover:text-white text-gray-400 rounded-lg hover:bg-gray-800 transition"
            title="Jump back 5s"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Main Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="w-7 h-7 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black flex items-center justify-center shadow-md shadow-cyan-500/20 active:scale-95 transition"
            title="Play / Pause (Spacebar)"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-black" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5 fill-black" />
            )}
          </button>

          {/* Step Forward 5s */}
          <button
            onClick={() => handleSeek(currentTime + 5)}
            className="p-1.5 hover:text-white text-gray-400 rounded-lg hover:bg-gray-800 transition"
            title="Jump forward 5s"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Loop Toggle */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg transition ${
              isLooping ? 'text-cyan-400 bg-cyan-950/40' : 'text-gray-400 hover:text-white'
            }`}
            title="Loop video preview"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Audio Volume & Fullscreen Trigger */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (isMuted) {
                audioEngine.setVoiceoverVolume(project.audio.voiceoverVolume);
                audioEngine.setMusicVolume(project.audio.musicVolume);
                setIsMuted(false);
              } else {
                audioEngine.setVoiceoverVolume(0);
                audioEngine.setMusicVolume(0);
                setIsMuted(true);
              }
            }}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1C1F2B] hover:bg-[#25293A] text-cyan-400 border border-cyan-500/30 text-[11px] font-bold transition"
            title="Fullscreen Preview"
          >
            <Tv className="w-3 h-3" />
            <span>Cinema View</span>
          </button>
        </div>
      </div>

      {/* ================= FULLSCREEN CINEMA PREVIEW OVERLAY ================= */}
      {isFullscreen && (
        <div
          onMouseMove={handleMouseMove}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
        >
          {/* Cinema Top Header (Fades out when HUD is hidden) */}
          <div
            className={`absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/90 to-transparent p-4 flex items-center justify-between text-xs text-white z-20 transition-opacity duration-300 ${
              showHud ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="font-extrabold text-sm text-white font-['Cabinet_Grotesk']">
                AutoCut <span className="text-cyan-400">Cinema Preview</span>
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-300 font-medium truncate max-w-xs">{project.title}</span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-gray-400 font-mono text-[11px]">Press ESC or F to exit</span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-red-900/60 text-white font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition border border-gray-700"
              >
                <Minimize2 className="w-4 h-4 text-red-400" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Giant Centered Canvas Screen */}
          <div className="relative w-full h-full flex items-center justify-center p-6 md:p-12">
            <div
              className={`relative shadow-2xl ring-1 ring-white/10 bg-black overflow-hidden rounded-xl ${
                isLandscape ? 'aspect-video w-full max-w-[1400px]' : 'aspect-[9/16] h-full max-h-[90vh]'
              }`}
            >
              <canvas
                ref={fullscreenCanvasRef}
                width={isLandscape ? 1920 : 1080}
                height={isLandscape ? 1080 : 1920}
                className="w-full h-full object-contain cursor-pointer"
                onClick={onTogglePlay}
              />
            </div>
          </div>

          {/* Floating Bottom Cinema HUD Controls */}
          <div
            className={`absolute bottom-6 inset-x-0 mx-auto max-w-2xl px-5 py-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-gray-800 shadow-2xl flex flex-col gap-2 z-20 transition-opacity duration-300 ${
              showHud ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Scrubber Slider */}
            <div className="w-full flex items-center gap-2">
              <span className="font-mono text-[11px] text-cyan-400 font-bold w-12 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.05"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 accent-cyan-400 h-1.5 bg-gray-800 rounded cursor-pointer"
              />
              <span className="font-mono text-[11px] text-gray-400 w-12">
                {formatTime(totalDuration)}
              </span>
            </div>

            {/* Transport Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleSeek(0)}
                  className="p-1 text-gray-400 hover:text-white transition"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSeek(currentTime - 5)}
                  className="p-1 text-gray-400 hover:text-white transition"
                  title="-5s"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-8 h-8 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center transition shadow-lg shadow-cyan-400/30"
                  title="Play / Pause"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-black" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5 fill-black" />
                  )}
                </button>
                <button
                  onClick={() => handleSeek(currentTime + 5)}
                  className="p-1 text-gray-400 hover:text-white transition"
                  title="+5s"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-1 transition ${isLooping ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                  title="Loop"
                >
                  <Repeat className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-1 text-gray-400 hover:text-white transition"
                  title="Exit Fullscreen"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
