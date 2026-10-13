import React, { useState, useEffect } from 'react';
import {
  VideoProject,
  Scene,
  KenBurnsEffect,
  VisualEffect,
  TransitionType,
} from '../../types/editor';
import {
  Sliders,
  Image as ImageIcon,
  Type,
  Volume2,
  Clock,
  Camera,
  Layers,
  Upload,
  Search,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Palette,
  Plus,
  Minus,
} from 'lucide-react';

interface CapCutInspectorProps {
  project: VideoProject;
  selectedScene: Scene | null;
  selectedCaptionId?: string | null;
  onSelectCaption?: (cId: string | null) => void;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onTimeSeek: (time: number) => void;
}

export const CapCutInspector: React.FC<CapCutInspectorProps> = ({
  project,
  selectedScene,
  selectedCaptionId,
  onSelectCaption,
  onUpdateProject,
  onTimeSeek,
}) => {
  const [activeInspectorTab, setActiveInspectorTab] = useState<'video' | 'text' | 'audio'>('video');

  // If a caption is selected, automatically switch to 'text' tab
  useEffect(() => {
    if (selectedCaptionId) {
      setActiveInspectorTab('text');
    }
  }, [selectedCaptionId]);

  const activeCaption = selectedCaptionId
    ? project.timelineCaptions.find((c) => c.id === selectedCaptionId)
    : null;

  const updateScene = (updater: (s: Scene) => Scene) => {
    if (!selectedScene) return;
    onUpdateProject((prev) => {
      const idx = prev.scenes.findIndex((s) => s.id === selectedScene.id);
      if (idx === -1) return prev;

      const newScenes = [...prev.scenes];
      newScenes[idx] = updater(newScenes[idx]);

      let accum = 0;
      const recalculated = newScenes.map((s) => {
        const dur = Math.max(0.4, s.duration || 1.0);
        const start = Math.round(accum * 10) / 10;
        accum += dur;
        const end = Math.round(accum * 10) / 10;
        return { ...s, duration: dur, startTime: start, endTime: end };
      });

      return { ...prev, scenes: recalculated };
    });
  };

  const handleAdjustDuration = (delta: number) => {
    if (!selectedScene) return;
    const newDur = Math.max(0.4, Math.round((selectedScene.duration + delta) * 10) / 10);
    updateScene((s) => ({ ...s, duration: newDur }));
  };

  const handleSetDuration = (val: number) => {
    if (!selectedScene) return;
    const sanitized = Math.max(0.4, Math.min(60, Math.round(val * 10) / 10));
    updateScene((s) => ({ ...s, duration: sanitized }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          updateScene((s) => ({ ...s, imageUrl: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = () => {
    if (!selectedScene || project.scenes.length <= 1) return;
    onUpdateProject((prev) => {
      const filtered = prev.scenes.filter((s) => s.id !== selectedScene.id);
      let accum = 0;
      const reindexed = filtered.map((s, idx) => {
        const start = Math.round(accum * 10) / 10;
        accum += s.duration;
        const end = Math.round(accum * 10) / 10;
        return { ...s, sceneNumber: idx + 1, startTime: start, endTime: end };
      });
      return { ...prev, scenes: reindexed };
    });
  };

  return (
    <aside className="w-72 sm:w-80 bg-[#14161F] border-l border-gray-800/80 flex flex-col h-full overflow-hidden select-none shrink-0 z-10">
      {/* Inspector Top Tabs */}
      <div className="h-11 px-3 border-b border-gray-800/80 flex items-center justify-between bg-[#111319] shrink-0">
        <div className="flex bg-gray-950 p-0.5 rounded-lg border border-gray-800 text-[11px] font-bold">
          <button
            onClick={() => setActiveInspectorTab('video')}
            className={`px-3 py-1 rounded transition ${
              activeInspectorTab === 'video'
                ? 'bg-[#1C1F2B] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Video
          </button>
          <button
            onClick={() => setActiveInspectorTab('text')}
            className={`px-3 py-1 rounded transition ${
              activeInspectorTab === 'text'
                ? 'bg-[#1C1F2B] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Captions
          </button>
          <button
            onClick={() => setActiveInspectorTab('audio')}
            className={`px-3 py-1 rounded transition ${
              activeInspectorTab === 'audio'
                ? 'bg-[#1C1F2B] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Audio
          </button>
        </div>

        {selectedScene && (
          <span className="font-mono text-[10px] text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
            Clip S{selectedScene.sceneNumber}
          </span>
        )}
      </div>

      {/* Inspector Body Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {/* ================= VIDEO TAB ================= */}
        {activeInspectorTab === 'video' && (
          selectedScene ? (
            <div className="space-y-4">
              {/* Title & Preview Thumbnail */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Clip Visual
                </span>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-800 bg-black group shadow">
                  <img src={selectedScene.imageUrl} alt={selectedScene.title} className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span className="text-[10px] font-bold text-white">Replace Photo</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Robust Clip Duration Control (Fixes user issue: "image ki deuration set ka option bi si kama nhi kr raha") */}
              <div className="p-3 rounded-xl bg-[#0D0F16] border border-gray-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Clip Duration
                  </span>

                  {/* Direct Number Input */}
                  <div className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded border border-gray-700">
                    <input
                      type="number"
                      step="0.1"
                      min="0.4"
                      max="60"
                      value={selectedScene.duration}
                      onChange={(e) => handleSetDuration(parseFloat(e.target.value) || 1.0)}
                      className="w-12 bg-transparent text-cyan-400 font-mono text-xs font-bold text-right outline-none"
                    />
                    <span className="text-[10px] text-gray-500 font-mono font-bold">sec</span>
                  </div>
                </div>

                {/* Smooth Slider */}
                <input
                  type="range"
                  min="0.5"
                  max="20.0"
                  step="0.1"
                  value={selectedScene.duration}
                  onChange={(e) => handleSetDuration(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />

                {/* Quick Step Adjustment Buttons */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  <button
                    onClick={() => handleAdjustDuration(-1.0)}
                    className="py-1 px-1 bg-gray-900 hover:bg-gray-800 text-gray-300 font-mono text-[10px] font-bold rounded border border-gray-800 text-center transition"
                  >
                    -1.0s
                  </button>
                  <button
                    onClick={() => handleAdjustDuration(-0.5)}
                    className="py-1 px-1 bg-gray-900 hover:bg-gray-800 text-gray-300 font-mono text-[10px] font-bold rounded border border-gray-800 text-center transition"
                  >
                    -0.5s
                  </button>
                  <button
                    onClick={() => handleAdjustDuration(0.5)}
                    className="py-1 px-1 bg-gray-900 hover:bg-gray-800 text-cyan-400 font-mono text-[10px] font-bold rounded border border-gray-800 text-center transition"
                  >
                    +0.5s
                  </button>
                  <button
                    onClick={() => handleAdjustDuration(1.0)}
                    className="py-1 px-1 bg-gray-900 hover:bg-gray-800 text-cyan-400 font-mono text-[10px] font-bold rounded border border-gray-800 text-center transition"
                  >
                    +1.0s
                  </button>
                </div>
              </div>

              {/* Narration Script */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Narration Sentence
                </span>
                <textarea
                  rows={3}
                  value={selectedScene.narration}
                  onChange={(e) => updateScene((s) => ({ ...s, narration: e.target.value }))}
                  className="w-full bg-[#0D0F16] border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Ken Burns Motion */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Ken Burns Camera Motion
                </span>
                <select
                  value={selectedScene.kenBurns}
                  onChange={(e) => updateScene((s) => ({ ...s, kenBurns: e.target.value as KenBurnsEffect }))}
                  className="w-full bg-[#0D0F16] border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  <option value="zoom-in">Zoom In</option>
                  <option value="zoom-out">Zoom Out</option>
                  <option value="pan-left">Pan Left</option>
                  <option value="pan-right">Pan Right</option>
                  <option value="float">Dynamic Float</option>
                  <option value="none">Static</option>
                </select>
              </div>

              {/* Visual Filter */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Color Grade Filter
                </span>
                <select
                  value={selectedScene.visualEffect || 'none'}
                  onChange={(e) => updateScene((s) => ({ ...s, visualEffect: e.target.value as VisualEffect }))}
                  className="w-full bg-[#0D0F16] border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  <option value="none">Original</option>
                  <option value="cinematic">Cinematic 35mm</option>
                  <option value="warm_film">Warm Golden Film</option>
                  <option value="moody_cold">Moody Cold</option>
                  <option value="noir">Noir B&W</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="vintage">Vintage Retro</option>
                </select>
              </div>

              {/* Transition */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Out-Transition
                </span>
                <select
                  value={selectedScene.transition}
                  onChange={(e) => updateScene((s) => ({ ...s, transition: e.target.value as TransitionType }))}
                  className="w-full bg-[#0D0F16] border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  <option value="crossfade">Crossfade</option>
                  <option value="flash_white">White Flash Dip</option>
                  <option value="slide">Slide Left</option>
                  <option value="blur_dissolve">Blur Dissolve</option>
                  <option value="none">Hard Cut</option>
                </select>
              </div>

              {/* Delete clip button */}
              <div className="pt-2 border-t border-gray-800 flex justify-end">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 text-xs font-bold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Clip</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>Select any clip from timeline to adjust visual properties.</p>
            </div>
          )
        )}

        {/* ================= CAPTIONS TAB ================= */}
        {activeInspectorTab === 'text' && (
          <div className="space-y-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D0F16] border border-gray-800">
              <div>
                <span className="text-xs font-bold text-white block">Captions Overlay</span>
                <span className="text-[10px] text-gray-400">
                  {project.captionStyle.enabled ? 'Active on video' : 'Hidden from video'}
                </span>
              </div>
              <button
                onClick={() =>
                  onUpdateProject((prev) => ({
                    ...prev,
                    captionStyle: { ...prev.captionStyle, enabled: !prev.captionStyle.enabled },
                  }))
                }
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition ${
                  project.captionStyle.enabled
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {project.captionStyle.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{project.captionStyle.enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            {/* Active Selected Caption Edit */}
            {activeCaption && (
              <div className="p-3 bg-[#0D0F16] rounded-xl border border-yellow-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1">
                    <Type className="w-3 h-3" />
                    Selected Caption Beat
                  </span>
                  <button
                    onClick={() => {
                      onUpdateProject((prev) => ({
                        ...prev,
                        timelineCaptions: prev.timelineCaptions.filter((c) => c.id !== activeCaption.id),
                      }));
                      if (onSelectCaption) onSelectCaption(null);
                    }}
                    className="text-gray-500 hover:text-red-400 p-0.5"
                    title="Delete caption"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <input
                  type="text"
                  value={activeCaption.text}
                  onChange={(e) => {
                    const txt = e.target.value;
                    onUpdateProject((prev) => ({
                      ...prev,
                      timelineCaptions: prev.timelineCaptions.map((c) =>
                        c.id === activeCaption.id ? { ...c, text: txt } : c
                      ),
                    }));
                  }}
                  className="w-full bg-black/60 border border-gray-700 rounded-lg p-2 text-xs text-white font-bold focus:outline-none focus:border-yellow-400"
                />

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-black/40 p-1.5 rounded border border-gray-800">
                    <span className="text-gray-500 block text-[9px]">START</span>
                    <span className="text-cyan-400 font-bold">{activeCaption.startTime.toFixed(1)}s</span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded border border-gray-800">
                    <span className="text-gray-500 block text-[9px]">DURATION</span>
                    <span className="text-yellow-400 font-bold">{activeCaption.duration.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            )}

            {/* CapCut Text Effects Studio */}
            <div className="p-3 bg-[#0D0F16] rounded-xl border border-gray-800 space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                CapCut Text Effects & Colors
              </span>

              {/* Base Text Color */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Base Text Color</span>
                <input
                  type="color"
                  value={project.captionStyle.textColor}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      captionStyle: { ...prev.captionStyle, textColor: e.target.value },
                    }))
                  }
                  className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                />
              </div>

              {/* Highlight Keyword Color */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Active Keyword Color</span>
                <input
                  type="color"
                  value={project.captionStyle.highlightColor}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      captionStyle: { ...prev.captionStyle, highlightColor: e.target.value },
                    }))
                  }
                  className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                />
              </div>

              {/* Stroke / Outline Width */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Stroke Width: {project.captionStyle.strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={project.captionStyle.strokeWidth}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      captionStyle: { ...prev.captionStyle, strokeWidth: parseInt(e.target.value) },
                    }))
                  }
                  className="w-full accent-yellow-500 cursor-pointer"
                />
              </div>

              {/* Glow Effect Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                <span className="text-gray-300">Neon Glow Bloom</span>
                <input
                  type="checkbox"
                  checked={project.captionStyle.glow}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      captionStyle: {
                        ...prev.captionStyle,
                        glow: e.target.checked,
                        glowColor: prev.captionStyle.highlightColor,
                      },
                    }))
                  }
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Position Y Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Screen Position Y: {project.captionStyle.yOffsetPercent}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  value={project.captionStyle.yOffsetPercent || 82}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      captionStyle: { ...prev.captionStyle, yOffsetPercent: parseInt(e.target.value) },
                    }))
                  }
                  className="w-full accent-yellow-500 cursor-pointer"
                />
              </div>

              {/* Animation Selector */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Animation Style</span>
                <select
                  value={project.captionStyle.animation}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      captionStyle: { ...prev.captionStyle, animation: e.target.value as any },
                    }))
                  }
                  className="bg-gray-950 border border-gray-700 text-white rounded p-1 text-[11px]"
                >
                  <option value="pop">Pop Impact</option>
                  <option value="bounce">Bounce</option>
                  <option value="karaoke">Karaoke Highlight</option>
                  <option value="fade">Smooth Fade</option>
                  <option value="none">Static</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ================= AUDIO TAB ================= */}
        {activeInspectorTab === 'audio' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Audio Track Mixing
            </span>

            <div className="p-2.5 rounded-xl bg-[#0D0F16] border border-gray-800 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Voiceover Volume</span>
                <span className="font-mono text-purple-400">{Math.round(project.audio.voiceoverVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={project.audio.voiceoverVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  onUpdateProject((prev) => ({ ...prev, audio: { ...prev.audio, voiceoverVolume: vol } }));
                }}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-[#0D0F16] border border-gray-800 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Music Volume</span>
                <span className="font-mono text-amber-400">{Math.round(project.audio.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={project.audio.musicVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  onUpdateProject((prev) => ({ ...prev, audio: { ...prev.audio, musicVolume: vol } }));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
