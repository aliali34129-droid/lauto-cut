import React, { useEffect, useRef, useState } from 'react';
import { VideoProject, Scene, TimelineCaption } from '../types/editor';
import { AudioEngine } from '../services/audioEngine';
import { preloadProjectImages, renderVideoFrame } from '../services/videoExporter';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Download,
  Film,
  Type,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface StudioPlayerProps {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlay: () => void;
  audioEngine: AudioEngine;
  onSelectScene: (scene: Scene) => void;
  selectedSceneId: string | null;
  onOpenExportModal: () => void;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
}

export const StudioPlayer: React.FC<StudioPlayerProps> = ({
  project,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onTogglePlay,
  audioEngine,
  onSelectScene,
  selectedSceneId,
  onOpenExportModal,
  onUpdateProject,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Editing a specific timeline caption
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [editCaptionStart, setEditCaptionStart] = useState(0);
  const [editCaptionDuration, setEditCaptionDuration] = useState(2);

  const totalDuration = project.scenes[project.scenes.length - 1]?.endTime || 10;

  // Active scene
  const activeSceneIndex = project.scenes.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );
  const currentScene =
    project.scenes[activeSceneIndex] ||
    (currentTime >= totalDuration
      ? project.scenes[project.scenes.length - 1]
      : project.scenes[0]);

  // Preload images
  useEffect(() => {
    preloadProjectImages(project.scenes).then((map) => {
      imageCacheRef.current = map;
    });
  }, [project.scenes]);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      if (isPlaying) {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        const next = currentTime + dt;

        if (next >= totalDuration) {
          if (isLooping) {
            onTimeUpdate(0);
            audioEngine.seek(0, true, !!project.audio.musicCustomUrl);
          } else {
            onTimeUpdate(totalDuration);
            onTogglePlay();
          }
        } else {
          onTimeUpdate(next);
        }
      } else {
        lastTime = now;
      }

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

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, totalDuration, isLooping, project, onTimeUpdate, onTogglePlay, audioEngine]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onTimeUpdate(newTime);
    audioEngine.seek(newTime, isPlaying, !!project.audio.musicCustomUrl);
  };

  // Dedicated Caption Layer Operations
  const handleStartEditCaption = (cap: TimelineCaption) => {
    setEditingCaptionId(cap.id);
    setEditCaptionText(cap.text);
    setEditCaptionStart(cap.startTime);
    setEditCaptionDuration(cap.duration);
  };

  const handleSaveCaption = () => {
    if (!editingCaptionId) return;
    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: prev.timelineCaptions.map((tc) =>
        tc.id === editingCaptionId
          ? {
              ...tc,
              text: editCaptionText,
              startTime: editCaptionStart,
              duration: editCaptionDuration,
              endTime: Math.round((editCaptionStart + editCaptionDuration) * 10) / 10,
            }
          : tc
      ),
    }));
    setEditingCaptionId(null);
  };

  const handleDeleteCaption = (id: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: prev.timelineCaptions.filter((tc) => tc.id !== id),
    }));
  };

  const handleAddNewCaptionSegment = () => {
    const start = Math.round(currentTime * 10) / 10;
    const dur = 2.0;
    const newCap: TimelineCaption = {
      id: `tc-${Date.now()}`,
      text: 'NEW CAPTION BEAT',
      startTime: start,
      endTime: start + dur,
      duration: dur,
    };

    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: [...prev.timelineCaptions, newCap].sort((a, b) => a.startTime - b.startTime),
    }));

    handleStartEditCaption(newCap);
  };

  const isLandscape = project.aspectRatio === '16:9';

  return (
    <div className="flex flex-col h-full bg-[#080B11] rounded-2xl border border-gray-800/80 overflow-hidden shadow-2xl">
      {/* Video Header */}
      <div className="h-11 px-4 bg-[#0D121C] border-b border-gray-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Film className="w-3.5 h-3.5 text-red-500" />
          <span className="font-bold text-gray-200 truncate">
            {currentScene ? `Scene ${currentScene.sceneNumber}: ${currentScene.title}` : 'Video Preview'}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-400">
          <span className="text-white font-bold">{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Main Canvas Player */}
      <div
        ref={containerRef}
        className="flex-1 bg-black flex items-center justify-center p-3 relative group overflow-hidden"
      >
        <div
          className={`relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black max-w-full max-h-full ${
            isLandscape ? 'aspect-video w-full' : 'aspect-[9/16] h-full max-h-[460px]'
          }`}
        >
          <canvas
            ref={canvasRef}
            width={isLandscape ? 1920 : 1080}
            height={isLandscape ? 1080 : 1920}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onTogglePlay}
          />

          {!isPlaying && (
            <div
              onClick={onTogglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transform hover:scale-105 active:scale-95 transition">
                <Play className="w-7 h-7 ml-1 fill-white" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Dedicated Captions Layer Area */}
      <div className="p-3 bg-[#0D121C] border-t border-gray-800/80 space-y-2.5">
        {/* Scrubber Range Input */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.1}
            value={currentTime}
            onChange={handleScrub}
            className="w-full accent-red-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
          />
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                const t = Math.max(0, currentTime - 5);
                onTimeUpdate(t);
                audioEngine.seek(t, isPlaying, !!project.audio.musicCustomUrl);
              }}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
              title="Rewind 5s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onTogglePlay}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 shadow-md ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1.5 rounded-lg transition ${
                isLooping ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white'
              }`}
              title="Toggle loop"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

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
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dedicated Caption Timeline Layer (Track) */}
        <div className="pt-2 border-t border-gray-800/80">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-bold text-yellow-400 flex items-center gap-1">
              <Type className="w-3.5 h-3.5" />
              <span>Captions Layer ({project.timelineCaptions.length} Segments)</span>
            </span>

            <button
              onClick={handleAddNewCaptionSegment}
              className="px-2 py-0.5 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 font-bold flex items-center gap-1 transition text-[10px]"
            >
              <Plus className="w-3 h-3" />
              <span>Add Caption at Playhead</span>
            </button>
          </div>

          {/* Captions Segments Scroll Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-gray-950 rounded-lg border border-gray-800/80 max-h-14">
            {project.timelineCaptions.map((cap) => {
              const isCurrent = currentTime >= cap.startTime && currentTime < cap.endTime;

              return (
                <div
                  key={cap.id}
                  onClick={() => {
                    onTimeUpdate(cap.startTime);
                    audioEngine.seek(cap.startTime, isPlaying, !!project.audio.musicCustomUrl);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 shrink-0 border ${
                    isCurrent
                      ? 'bg-yellow-500 text-black border-yellow-400 shadow-sm'
                      : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <span className="truncate max-w-[130px]">{cap.text}</span>
                  <span className="text-[9px] font-mono opacity-75">{cap.startTime.toFixed(1)}s</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditCaption(cap);
                    }}
                    className="p-0.5 hover:text-white rounded"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCaption(cap.id);
                    }}
                    className="p-0.5 hover:text-red-300 rounded"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inline Caption Editor Modal / Card */}
        {editingCaptionId && (
          <div className="p-2.5 rounded-lg bg-gray-950 border border-yellow-500/40 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-bold text-yellow-300">Edit Caption Segment</span>
              <button onClick={() => setEditingCaptionId(null)} className="text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              value={editCaptionText}
              onChange={(e) => setEditCaptionText(e.target.value)}
              className="w-full bg-[#0D121C] border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-yellow-500 font-bold"
              placeholder="Caption text..."
            />

            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Start:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editCaptionStart}
                  onChange={(e) => setEditCaptionStart(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-[#0D121C] border border-gray-700 rounded px-1 text-center text-white font-mono"
                />
                <span className="text-gray-400">s</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-gray-400">Duration:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={editCaptionDuration}
                  onChange={(e) => setEditCaptionDuration(parseFloat(e.target.value) || 1)}
                  className="w-14 bg-[#0D121C] border border-gray-700 rounded px-1 text-center text-white font-mono"
                />
                <span className="text-gray-400">s</span>
              </div>

              <button
                onClick={handleSaveCaption}
                className="px-2.5 py-1 bg-yellow-500 text-black font-bold rounded text-[11px] flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}

        {/* Scene Jump Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1">
            Scenes:
          </span>
          {project.scenes.map((scene) => {
            const isActive = currentScene?.id === scene.id;
            return (
              <button
                key={scene.id}
                onClick={() => {
                  onTimeUpdate(scene.startTime);
                  audioEngine.seek(scene.startTime, isPlaying, !!project.audio.musicCustomUrl);
                  onSelectScene(scene);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>S{scene.sceneNumber}</span>
                <span className="text-[9px] font-mono opacity-70">
                  {scene.startTime.toFixed(0)}s
                </span>
              </button>
            );
          })}
        </div>

        {/* Big Export Video Button */}
        <button
          onClick={onOpenExportModal}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Full HD Video (1080p)</span>
        </button>
      </div>
    </div>
  );
};
