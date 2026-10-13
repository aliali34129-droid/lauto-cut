import React, { useRef, useState, useEffect } from 'react';
import { VideoProject, Scene } from '../types/editor';
import {
  Image as ImageIcon,
  Mic,
  Music,
  Type,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Sliders,
  Volume2,
} from 'lucide-react';

interface TimelineProps {
  project: VideoProject;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  selectedSceneId: string | null;
  onSelectScene: (scene: Scene) => void;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onAutoSyncToVoiceover: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  currentTime,
  onTimeUpdate,
  selectedSceneId,
  onSelectScene,
  onUpdateProject,
  onAutoSyncToVoiceover,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackAreaRef = useRef<HTMLDivElement | null>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(36); // zoom level
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const totalDuration =
    project.scenes[project.scenes.length - 1]?.endTime || 10;
  const totalTimelineWidth = Math.max(800, totalDuration * pixelsPerSecond + 120);

  // Time scrubber click/drag logic
  const handleScrub = (clientX: number) => {
    if (!trackAreaRef.current) return;
    const rect = trackAreaRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / pixelsPerSecond));
    onTimeUpdate(newTime);
  };

  const handleMouseDownScrubber = (e: React.MouseEvent) => {
    setIsDraggingPlayhead(true);
    handleScrub(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        handleScrub(e.clientX);
      }
    };
    const handleMouseUp = () => {
      if (isDraggingPlayhead) {
        setIsDraggingPlayhead(false);
      }
    };
    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, pixelsPerSecond, totalDuration]);

  // Adjust duration of a specific scene
  const adjustSceneDuration = (sceneId: string, delta: number) => {
    onUpdateProject((prev) => {
      const idx = prev.scenes.findIndex((s) => s.id === sceneId);
      if (idx === -1) return prev;

      const newScenes = [...prev.scenes];
      const targetScene = { ...newScenes[idx] };
      const newDur = Math.max(1.5, Math.round((targetScene.duration + delta) * 10) / 10);
      targetScene.duration = newDur;
      newScenes[idx] = targetScene;

      // Recalculate start & end times for all downstream scenes
      let accum = 0;
      const recalculated = newScenes.map((s) => {
        const start = Math.round(accum * 10) / 10;
        accum += s.duration;
        const end = Math.round(accum * 10) / 10;
        return {
          ...s,
          startTime: start,
          endTime: end,
        };
      });

      return { ...prev, scenes: recalculated };
    });
  };

  // Reorder scene left or right
  const moveScene = (sceneIndex: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? sceneIndex - 1 : sceneIndex + 1;
    if (targetIdx < 0 || targetIdx >= project.scenes.length) return;

    onUpdateProject((prev) => {
      const newScenes = [...prev.scenes];
      const temp = newScenes[sceneIndex];
      newScenes[sceneIndex] = newScenes[targetIdx];
      newScenes[targetIdx] = temp;

      // Recalculate sceneNumbers & timings
      let accum = 0;
      const recalculated = newScenes.map((s, i) => {
        const start = Math.round(accum * 10) / 10;
        accum += s.duration;
        const end = Math.round(accum * 10) / 10;
        return {
          ...s,
          sceneNumber: i + 1,
          startTime: start,
          endTime: end,
        };
      });

      return { ...prev, scenes: recalculated };
    });
  };

  // Add new scene
  const handleAddNewScene = () => {
    onUpdateProject((prev) => {
      const lastScene = prev.scenes[prev.scenes.length - 1];
      const start = lastScene ? lastScene.endTime : 0;
      const duration = 5.0;
      const end = start + duration;

      const newScene: Scene = {
        id: `scene-${Date.now()}`,
        sceneNumber: prev.scenes.length + 1,
        title: `Scene ${prev.scenes.length + 1}`,
        narration: 'Enter narration text here for the next scene.',
        startTime: start,
        endTime: end,
        duration: duration,
        imageUrl:
          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80',
        kenBurns: 'zoom-in',
        transition: 'crossfade',
        captions: [
          {
            id: `cap-${Date.now()}`,
            text: 'ENTER CAPTION HERE',
            relativeStart: 0,
            duration: 5.0,
          },
        ],
      };

      return {
        ...prev,
        scenes: [...prev.scenes, newScene],
      };
    });
  };

  // Generate tick marks for time ruler
  const rulerTicks = [];
  const tickStep = pixelsPerSecond < 30 ? 5 : pixelsPerSecond < 60 ? 2 : 1;
  for (let s = 0; s <= Math.ceil(totalDuration) + 5; s += tickStep) {
    rulerTicks.push(s);
  }

  return (
    <div className="h-64 sm:h-72 bg-[#080B11] border-t border-gray-800/90 flex flex-col select-none relative">
      {/* Timeline Action Bar */}
      <div className="h-10 px-4 bg-[#0D121C] border-b border-gray-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-gray-200 tracking-wide flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-red-500" />
            Timeline Tracks
          </span>

          {/* Auto Sync Button */}
          <button
            onClick={onAutoSyncToVoiceover}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition text-[11px] font-medium"
            title="Automatically distribute scene image durations according to voiceover speech length"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Sync to Voiceover</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 text-gray-400">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-gray-900/80 rounded px-1.5 py-0.5 border border-gray-800">
            <button
              onClick={() => setPixelsPerSecond((p) => Math.max(16, p - 6))}
              className="p-1 hover:text-white rounded"
              title="Zoom out timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1">
              {Math.round((pixelsPerSecond / 36) * 100)}%
            </span>
            <button
              onClick={() => setPixelsPerSecond((p) => Math.min(100, p + 6))}
              className="p-1 hover:text-white rounded"
              title="Zoom in timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleAddNewScene}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-medium transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Track Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#06080D]"
      >
        <div
          ref={trackAreaRef}
          style={{ width: `${totalTimelineWidth}px` }}
          className="h-full relative flex flex-col"
        >
          {/* 1. Time Ruler Bar */}
          <div
            onMouseDown={handleMouseDownScrubber}
            className="h-6 bg-[#0B0F17] border-b border-gray-800/80 relative cursor-pointer"
          >
            {rulerTicks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * pixelsPerSecond}px` }}
                className="absolute top-0 bottom-0 flex flex-col items-start border-l border-gray-800 text-[9px] font-mono text-gray-500 pl-1"
              >
                <span>{sec}s</span>
              </div>
            ))}
          </div>

          {/* 2. Visuals & Scenes Track */}
          <div className="h-20 bg-gray-950/40 border-b border-gray-800/60 relative flex items-center px-1">
            <div className="absolute left-1 top-1 text-[9px] font-semibold text-gray-400 flex items-center gap-1 z-10 pointer-events-none bg-black/70 px-1.5 py-0.5 rounded">
              <ImageIcon className="w-2.5 h-2.5 text-emerald-400" />
              <span>SCENES & VISUALS</span>
            </div>

            {project.scenes.map((scene, idx) => {
              const isSelected = selectedSceneId === scene.id;
              const sceneWidth = scene.duration * pixelsPerSecond;
              const sceneLeft = scene.startTime * pixelsPerSecond;

              return (
                <div
                  key={scene.id}
                  onClick={() => onSelectScene(scene)}
                  style={{
                    left: `${sceneLeft}px`,
                    width: `${Math.max(48, sceneWidth - 2)}px`,
                  }}
                  className={`absolute top-1 bottom-1 rounded-lg border cursor-pointer transition-all flex overflow-hidden group select-none shadow-sm ${
                    isSelected
                      ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/30'
                      : 'border-gray-700/80 bg-gray-900/90 hover:border-gray-500'
                  }`}
                >
                  {/* Image Thumbnail */}
                  <div className="w-14 h-full relative bg-black shrink-0 overflow-hidden">
                    <img
                      src={scene.imageUrl}
                      alt={scene.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-center text-white py-0.2">
                      S{scene.sceneNumber}
                    </div>
                  </div>

                  {/* Scene info & quick duration controls */}
                  <div className="flex-1 p-1.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-gray-200 truncate">
                        {scene.title}
                      </span>
                      <span className="font-mono text-[9px] text-gray-400 shrink-0 bg-black/50 px-1 rounded">
                        {scene.duration.toFixed(1)}s
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1">
                      <span className="truncate max-w-[120px] text-gray-300">
                        {scene.narration}
                      </span>

                      {/* Quick timing fine-tune buttons */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustSceneDuration(scene.id, -0.5);
                          }}
                          className="px-1 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                          title="Shorten scene by 0.5s"
                        >
                          -0.5s
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustSceneDuration(scene.id, 0.5);
                          }}
                          className="px-1 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                          title="Lengthen scene by 0.5s"
                        >
                          +0.5s
                        </button>
                        {idx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveScene(idx, 'left');
                            }}
                            className="p-0.5 hover:text-white text-gray-400"
                            title="Move scene left"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        )}
                        {idx < project.scenes.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveScene(idx, 'right');
                            }}
                            className="p-0.5 hover:text-white text-gray-400"
                            title="Move scene right"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Voiceover Audio Track (Simulated Waveform) */}
          <div className="h-14 bg-gray-950/70 border-b border-gray-800/60 relative flex items-center px-2">
            <div className="absolute left-2 top-1 text-[9px] font-semibold text-purple-400 flex items-center gap-1 z-10 pointer-events-none bg-black/70 px-1.5 py-0.5 rounded">
              <Mic className="w-2.5 h-2.5 text-purple-400" />
              <span>
                VOICEOVER: {project.audio.voiceoverFileName || 'AI Voiceover'}
              </span>
            </div>

            {/* Waveform Bars across total duration */}
            <div
              style={{ width: `${totalDuration * pixelsPerSecond}px` }}
              className="h-8 bg-purple-950/20 border border-purple-800/40 rounded-md relative flex items-center px-1 overflow-hidden"
            >
              <div className="w-full h-full flex items-center space-x-[2px] opacity-70">
                {Array.from({
                  length: Math.max(10, Math.floor((totalDuration * pixelsPerSecond) / 4)),
                }).map((_, barIdx) => {
                  const heightPct = 25 + Math.sin(barIdx * 0.4) * 35 + ((barIdx * 7) % 35);
                  return (
                    <div
                      key={barIdx}
                      style={{ height: `${Math.min(95, heightPct)}%` }}
                      className="w-[2px] bg-purple-500 rounded-full"
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Trending Background Music Track */}
          <div className="h-10 bg-gray-950/50 border-b border-gray-800/60 relative flex items-center px-2">
            <div className="absolute left-2 top-1 text-[9px] font-semibold text-amber-400 flex items-center gap-1 z-10 pointer-events-none bg-black/70 px-1.5 py-0.5 rounded">
              <Music className="w-2.5 h-2.5 text-amber-400" />
              <span>
                BGM: {project.audio.musicTrackId.replace('track-', '').replace('-', ' ').toUpperCase()}
              </span>
              {project.audio.autoDucking && (
                <span className="text-[8px] text-amber-300/80 bg-amber-500/10 px-1 rounded ml-1">
                  Auto-Ducking On
                </span>
              )}
            </div>

            <div
              style={{ width: `${totalDuration * pixelsPerSecond}px` }}
              className="h-5 bg-amber-950/20 border border-amber-800/30 rounded relative flex items-center px-1"
            >
              <div className="w-full flex items-center space-x-1 opacity-60">
                {Array.from({
                  length: Math.max(5, Math.floor((totalDuration * pixelsPerSecond) / 12)),
                }).map((_, mIdx) => (
                  <div
                    key={mIdx}
                    className="h-2 w-2 rounded-full bg-amber-500/60"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 5. Dynamic Captions Track */}
          <div className="h-9 bg-gray-950/30 relative flex items-center px-2">
            <div className="absolute left-2 top-1 text-[9px] font-semibold text-yellow-400 flex items-center gap-1 z-10 pointer-events-none bg-black/70 px-1.5 py-0.5 rounded">
              <Type className="w-2.5 h-2.5 text-yellow-400" />
              <span>
                CAPTIONS ({project.captionStyle.preset.toUpperCase()})
              </span>
            </div>

            {/* Captions Blocks per scene */}
            {project.scenes.map((scene) => {
              const sceneLeft = scene.startTime * pixelsPerSecond;
              return (
                <div
                  key={`cap-track-${scene.id}`}
                  style={{
                    left: `${sceneLeft}px`,
                    width: `${scene.duration * pixelsPerSecond}px`,
                  }}
                  className="absolute top-1 bottom-1 flex items-center space-x-1 px-1 overflow-hidden"
                >
                  {(scene.captions || []).map((cap, cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        width: `${Math.max(20, cap.duration * pixelsPerSecond - 2)}px`,
                      }}
                      className="h-4 bg-yellow-500/20 border border-yellow-500/40 rounded text-[8px] font-bold text-yellow-300 truncate px-1 flex items-center"
                    >
                      {cap.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Red Playhead Needle & Scrubber Line */}
          <div
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
            className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          >
            {/* Playhead Top Knob */}
            <div className="w-3.5 h-3.5 -ml-[6px] -mt-[1px] bg-red-600 rounded-sm transform rotate-45 border border-white shadow-md pointer-events-auto cursor-ew-resize" />
          </div>
        </div>
      </div>
    </div>
  );
};
