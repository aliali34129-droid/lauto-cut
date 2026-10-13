import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoProject, Scene } from '../types/editor';
import { AudioEngine } from '../services/audioEngine';
import {
  preloadProjectImages,
  renderVideoFrame,
} from '../services/videoExporter';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Repeat,
  Sparkles,
  Layers,
  Wand2,
} from 'lucide-react';

interface VideoPreviewProps {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlay: () => void;
  audioEngine: AudioEngine;
  onSelectScene: (scene: Scene) => void;
  selectedSceneId: string | null;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  project,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onTogglePlay,
  audioEngine,
  onSelectScene,
  selectedSceneId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const totalDuration =
    project.scenes[project.scenes.length - 1]?.endTime || 10;

  // Active scene calculation
  const activeSceneIndex = project.scenes.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );
  const currentScene =
    project.scenes[activeSceneIndex] ||
    (currentTime >= totalDuration
      ? project.scenes[project.scenes.length - 1]
      : project.scenes[0]);

  // Preload project images on scene changes
  useEffect(() => {
    let cancelled = false;
    preloadProjectImages(project.scenes).then((map) => {
      if (!cancelled) {
        imageCacheRef.current = map;
        setImagesLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [project.scenes]);

  // Animation frame loop for smooth playback
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        const nextTime = currentTime + delta;
        if (nextTime >= totalDuration) {
          if (isLooping) {
            onTimeUpdate(0);
            audioEngine.seek(0, true, !!project.audio.musicCustomUrl);
          } else {
            onTimeUpdate(totalDuration);
            onTogglePlay();
          }
        } else {
          onTimeUpdate(nextTime);
        }
      } else {
        lastTimestamp = now;
      }

      // Draw canvas frame
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderVideoFrame(
            ctx,
            project,
            currentTime,
            canvas.width,
            canvas.height,
            imageCacheRef.current
          );
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    isPlaying,
    currentTime,
    totalDuration,
    isLooping,
    project,
    onTimeUpdate,
    onTogglePlay,
    audioEngine,
  ]);

  // Skip backwards / forwards by 5 seconds
  const handleSkip = useCallback(
    (seconds: number) => {
      const targetTime = Math.max(0, Math.min(totalDuration, currentTime + seconds));
      onTimeUpdate(targetTime);
      audioEngine.seek(targetTime, isPlaying, !!project.audio.musicCustomUrl);
    },
    [currentTime, totalDuration, onTimeUpdate, audioEngine, isPlaying, project.audio.musicCustomUrl]
  );

  // Jump to specific scene
  const handleJumpScene = (direction: 'prev' | 'next') => {
    if (activeSceneIndex === -1) return;
    const targetIdx =
      direction === 'prev'
        ? Math.max(0, activeSceneIndex - 1)
        : Math.min(project.scenes.length - 1, activeSceneIndex + 1);
    const targetScene = project.scenes[targetIdx];
    if (targetScene) {
      onTimeUpdate(targetScene.startTime);
      audioEngine.seek(targetScene.startTime, isPlaying, !!project.audio.musicCustomUrl);
      onSelectScene(targetScene);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      audioEngine.setVoiceoverVolume(project.audio.voiceoverVolume);
      audioEngine.setMusicVolume(project.audio.musicVolume);
      setIsMuted(false);
    } else {
      audioEngine.setVoiceoverVolume(0);
      audioEngine.setMusicVolume(0);
      setIsMuted(true);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    const tenths = Math.floor((timeInSec % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  const isLandscape = project.aspectRatio === '16:9';

  return (
    <div className="flex flex-col h-full bg-[#07090E] border-r border-gray-800/80 relative">
      {/* Top Video Header / Scene Status */}
      <div className="h-10 px-4 border-b border-gray-800/60 bg-[#0B0F17]/70 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-gray-200">
            {currentScene ? `Scene ${currentScene.sceneNumber}: ${currentScene.title}` : 'Ready'}
          </span>
          {currentScene && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
              {currentScene.kenBurns.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="font-mono text-gray-300 font-medium">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
          <span className="hidden sm:inline text-gray-600">|</span>
          <span className="text-gray-400 hidden sm:inline">
            {project.scenes.length} Scenes
          </span>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-3 sm:p-6 bg-[#04060A] relative overflow-hidden group select-none"
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

        {/* Canvas Container with Proper Aspect Ratio */}
        <div
          className={`relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black max-w-full max-h-full transition-all duration-300 ${
            isLandscape
              ? 'aspect-video w-full max-w-[850px]'
              : 'aspect-[9/16] h-full max-h-[580px]'
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
              className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] cursor-pointer transition opacity-90 hover:opacity-100"
            >
              <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transform hover:scale-105 active:scale-95 transition">
                <Play className="w-8 h-8 ml-1 fill-white" />
              </div>
            </div>
          )}

          {/* Top Left Watermark / Niche Tag */}
          <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-gray-300 border border-white/10 pointer-events-none">
            <Sparkles className="w-3 h-3 text-red-400" />
            <span className="font-semibold tracking-wide uppercase">
              AutoTube Preview
            </span>
          </div>

          {/* Bottom Right Resolution Badge */}
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-gray-400 border border-white/10 pointer-events-none">
            {isLandscape ? '1080p FHD' : '1080x1920 HD'}
          </div>
        </div>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="h-14 px-4 bg-[#0B0F17] border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-300 z-10">
        {/* Left: Skip & Scenes */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => handleJumpScene('prev')}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
            title="Previous Scene"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSkip(-5)}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition flex items-center text-[10px] font-mono"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-0.5" />
            <span>5s</span>
          </button>
        </div>

        {/* Center: Main Play/Pause & Time Indicator */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onTogglePlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25'
            }`}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            )}
          </button>

          <button
            onClick={() => handleSkip(5)}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition flex items-center text-[10px] font-mono"
            title="Fast forward 5 seconds"
          >
            <span>+5s</span>
          </button>

          <button
            onClick={() => handleJumpScene('next')}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
            title="Next Scene"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Loop, Volume, Fullscreen */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg transition ${
              isLooping
                ? 'bg-red-500/20 text-red-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title={isLooping ? 'Looping enabled' : 'Toggle loop'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
            title={isMuted ? 'Unmute' : 'Mute audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleFullscreen}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition hidden sm:block"
            title="Fullscreen canvas"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
