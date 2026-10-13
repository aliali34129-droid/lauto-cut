import React, { useState } from 'react';
import { VideoProject, CaptionPresetId, CaptionStyle } from '../types/editor';
import { CAPTION_PRESETS } from '../data/captionPresets';
import { AudioEngine, TRENDING_MUSIC_TRACKS } from '../services/audioEngine';
import {
  Type,
  Music,
  Zap,
  Play,
  Pause,
  Volume2,
  Check,
  Sparkles,
  ArrowLeft,
  Download,
  Palette,
  Sliders,
  EyeOff,
  Eye,
  Trash2,
  Wand2,
} from 'lucide-react';

interface StepStyleMusicProps {
  project: VideoProject;
  audioEngine: AudioEngine;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onPrevStep: () => void;
  onOpenExportModal: () => void;
}

export const StepStyleMusic: React.FC<StepStyleMusicProps> = ({
  project,
  audioEngine,
  onUpdateProject,
  onPrevStep,
  onOpenExportModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'presets' | 'customize' | 'music'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);

  const style = project.captionStyle;

  // Apply a preset from 20+ styles
  const handleApplyPreset = (presetDef: (typeof CAPTION_PRESETS)[0]) => {
    onUpdateProject((prev) => ({
      ...prev,
      captionStyle: {
        ...prev.captionStyle,
        ...presetDef.style,
        enabled: true,
      },
    }));
  };

  // Update specific style field
  const updateStyleField = (field: keyof CaptionStyle, value: any) => {
    onUpdateProject((prev) => ({
      ...prev,
      captionStyle: {
        ...prev.captionStyle,
        [field]: value,
      },
    }));
  };

  // Auto-generate captions from voiceover/scenes
  const handleAutoGenerateCaptions = () => {
    onUpdateProject((prev) => {
      const generatedTimelineCaptions: typeof prev.timelineCaptions = [];
      let globalCounter = 1;

      prev.scenes.forEach((scene) => {
        const words = scene.narration.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return;

        // Split into chunks of 3-5 words
        const chunkSize = 4;
        const totalChunks = Math.ceil(words.length / chunkSize);
        const chunkDuration = scene.duration / Math.max(1, totalChunks);

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunkWords = words.slice(i, i + chunkSize).join(' ');
          const chunkIdx = Math.floor(i / chunkSize);
          const start = Math.round((scene.startTime + chunkIdx * chunkDuration) * 10) / 10;
          const end = Math.round((start + chunkDuration) * 10) / 10;

          generatedTimelineCaptions.push({
            id: `tc-${Date.now()}-${globalCounter++}`,
            text: chunkWords,
            startTime: start,
            endTime: end,
            duration: Math.round((end - start) * 10) / 10,
          });
        }
      });

      return {
        ...prev,
        timelineCaptions: generatedTimelineCaptions,
        captionStyle: {
          ...prev.captionStyle,
          enabled: true,
        },
      };
    });
  };

  // Remove / Clear all captions
  const handleRemoveAllCaptions = () => {
    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: [],
      captionStyle: {
        ...prev.captionStyle,
        enabled: false,
      },
      scenes: prev.scenes.map((s) => ({ ...s, captions: [] })),
    }));
  };

  const handleSelectMusicTrack = (trackId: string, synthPreset: any) => {
    audioEngine.setMusicTrackPreset(synthPreset);
    onUpdateProject((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        musicTrackId: trackId,
        musicCustomUrl: null,
      },
    }));
  };

  const handleTogglePreview = (synthPreset: any, trackId: string) => {
    if (previewTrackId === trackId) {
      audioEngine.pause();
      setPreviewTrackId(null);
    } else {
      audioEngine.setMusicTrackPreset(synthPreset);
      audioEngine.play(0);
      setPreviewTrackId(trackId);
    }
  };

  const CATEGORIES = ['All', 'Viral YouTube', 'Cinematic & Documentary', 'Aesthetic & Neon', 'Clean & Modern'];
  const filteredPresets = CAPTION_PRESETS.filter((p) => selectedCategory === 'All' || p.category === selectedCategory);

  const POPULAR_COLORS = [
    { name: 'Viral Yellow', hex: '#FFE600' },
    { name: 'Electric Cyan', hex: '#06B6D4' },
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Neon Green', hex: '#22C55E' },
    { name: 'Fiery Red', hex: '#EF4444' },
    { name: 'Hot Orange', hex: '#F97316' },
    { name: 'Vibrant Magenta', hex: '#EC4899' },
    { name: 'Deep Black', hex: '#000000' },
  ];

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h2 className="text-base font-bold text-white">
              Captions & Background Music
            </h2>
          </div>

          {/* Enable / Disable Captions Master Switch */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateStyleField('enabled', !style.enabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                style.enabled
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'bg-gray-900 text-gray-500 border border-gray-800'
              }`}
            >
              {style.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{style.enabled ? 'Captions Active' : 'Captions Disabled'}</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Choose from 22+ viral subtitle styles, customize colors manually, or turn captions off completely.
        </p>
      </div>

      {/* Sub Tabs: Presets | Customize Colors | Background Music */}
      <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('presets')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            activeSubTab === 'presets' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          20+ Caption Styles ({CAPTION_PRESETS.length})
        </button>
        <button
          onClick={() => setActiveSubTab('customize')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            activeSubTab === 'customize' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          Manual Color & Font Studio
        </button>
        <button
          onClick={() => setActiveSubTab('music')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            activeSubTab === 'music' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          Trending Music & Mixer
        </button>
      </div>

      {/* Quick Action Tools Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D121C] border border-gray-800 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerateCaptions}
            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1.5 transition"
            title="Auto-generate synced captions from voiceover script"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Generate from Voiceover</span>
          </button>
        </div>

        <button
          onClick={handleRemoveAllCaptions}
          className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1 text-[11px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove All Captions</span>
        </button>
      </div>

      {/* SUB-TAB 1: 20+ CAPTION PRESETS */}
      {activeSubTab === 'presets' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition font-medium ${
                  selectedCategory === cat
                    ? 'bg-yellow-500 text-black font-bold'
                    : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 20+ Presets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredPresets.map((presetDef) => {
              const isSelected = style.preset === presetDef.id && style.enabled;

              return (
                <div
                  key={presetDef.id}
                  onClick={() => handleApplyPreset(presetDef)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-yellow-950/30 border-yellow-500 ring-1 ring-yellow-500/40'
                      : 'bg-[#0D121C] border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{presetDef.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2 leading-tight">{presetDef.description}</p>

                  {/* Visual Preview Badge */}
                  <div className="py-1.5 px-2 rounded-lg bg-black/80 border border-gray-800 text-center">
                    <span
                      style={{
                        color: presetDef.style.highlightColor || presetDef.style.textColor,
                        textShadow: presetDef.style.shadow ? '2px 2px 0 #000' : 'none',
                        fontFamily: presetDef.style.fontFamily,
                      }}
                      className="font-black text-xs tracking-wider"
                    >
                      {presetDef.previewSample}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MANUAL COLOR & FONT STUDIO */}
      {activeSubTab === 'customize' && (
        <div className="p-4 rounded-xl bg-[#0D121C] border border-gray-800 space-y-4 text-xs">
          {/* Live Preview Box */}
          <div className="p-4 rounded-xl bg-black border border-gray-800 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[90px]">
            <span className="text-[9px] font-mono text-gray-600 absolute top-2 left-2">
              Live Custom Style Preview
            </span>
            <div
              style={{
                backgroundColor: style.backgroundOpacity > 0 ? style.backgroundColor : 'transparent',
                opacity: 1,
                padding: `${style.boxPadding || 8}px 18px`,
                borderRadius: '8px',
              }}
            >
              <span
                style={{
                  color: style.highlightColor || style.textColor,
                  fontFamily: style.fontFamily,
                  textShadow: style.strokeWidth > 0 ? `0 0 1px ${style.strokeColor}` : 'none',
                }}
                className={`font-black text-base tracking-wider ${style.uppercase ? 'uppercase' : ''}`}
              >
                CUSTOM ACTIVE SUBTITLE
              </span>
            </div>
          </div>

          {/* Color 1: Primary Text Color */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-gray-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-yellow-400" />
                Text Color
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={style.textColor || '#FFFFFF'}
                  onChange={(e) => updateStyleField('textColor', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-[11px] text-gray-400 uppercase">{style.textColor}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {POPULAR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateStyleField('textColor', c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className="w-5 h-5 rounded-full border border-gray-700 hover:scale-110 transition"
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Color 2: Highlight Keyword Color */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-gray-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Highlight Accent Color (Active Word)
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={style.highlightColor || '#FFE600'}
                  onChange={(e) => updateStyleField('highlightColor', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-[11px] text-gray-400 uppercase">{style.highlightColor}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {POPULAR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateStyleField('highlightColor', c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className="w-5 h-5 rounded-full border border-gray-700 hover:scale-110 transition"
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Color 3: Outline / Stroke & Width */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-gray-300">
              <span className="font-semibold">Outline Stroke Width: {style.strokeWidth}px</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={style.strokeColor === 'transparent' ? '#000000' : style.strokeColor}
                  onChange={(e) => updateStyleField('strokeColor', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={style.strokeWidth}
              onChange={(e) => updateStyleField('strokeWidth', parseInt(e.target.value))}
              className="w-full accent-yellow-500 cursor-pointer"
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="block font-semibold text-gray-300 mb-1.5">Font Typography</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(['Cabinet Grotesk', 'Montserrat', 'Inter', 'Playfair Display', 'JetBrains Mono'] as const).map(
                (fam) => (
                  <button
                    key={fam}
                    onClick={() => updateStyleField('fontFamily', fam)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                      style.fontFamily === fam
                        ? 'bg-yellow-500 text-black border-yellow-500'
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:text-white'
                    }`}
                  >
                    {fam}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Position Slider (Y-Offset) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-gray-300">
              <span className="font-semibold">Vertical Screen Position: {style.yOffsetPercent}%</span>
              <span className="text-gray-500 text-[10px]">Top to Bottom</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="1"
              value={style.yOffsetPercent || 82}
              onChange={(e) => updateStyleField('yOffsetPercent', parseInt(e.target.value))}
              className="w-full accent-yellow-500 cursor-pointer"
            />
          </div>

          {/* Font Size & All-Caps Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-lg border border-gray-800">
              {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => updateStyleField('fontSize', sz)}
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition ${
                    style.fontSize === sz ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
              <input
                type="checkbox"
                checked={style.uppercase}
                onChange={(e) => updateStyleField('uppercase', e.target.checked)}
                className="w-4 h-4 accent-yellow-500 cursor-pointer"
              />
              <span>All-Caps</span>
            </label>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRENDING MUSIC & AUTO-DUCKING */}
      {activeSubTab === 'music' && (
        <div className="p-4 rounded-xl bg-[#0D121C] border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-xs font-bold text-white">Trending Background Music</h3>
                <p className="text-[11px] text-gray-400">Royalty-free YouTube tracks for faceless channels</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-950 px-2.5 py-1 rounded-lg border border-gray-800 text-[11px] text-amber-400 font-medium">
              <Zap className="w-3 h-3" />
              <span>Voice Auto-Ducking (-75%)</span>
            </div>
          </div>

          {/* Music Tracks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TRENDING_MUSIC_TRACKS.map((track) => {
              const isSelected = project.audio.musicTrackId === track.id;
              const isPlaying = previewTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handleSelectMusicTrack(track.id, track.synthPreset)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-950/25 border-amber-500 ring-1 ring-amber-500/40'
                      : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{track.title}</span>
                    <span className="text-[10px] text-gray-400">{track.genre}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePreview(track.synthPreset, track.id);
                      }}
                      className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                        isPlaying ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:text-white'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Music Volume Slider */}
          <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800">
            <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
              <span className="flex items-center gap-1 font-semibold">
                <Volume2 className="w-3 h-3 text-amber-400" />
                Background Music Level
              </span>
              <span className="font-mono text-gray-400">{Math.round(project.audio.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={project.audio.musicVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                audioEngine.setMusicVolume(vol);
                onUpdateProject((prev) => ({
                  ...prev,
                  audio: { ...prev.audio, musicVolume: vol },
                }));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrevStep}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Images</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Full HD Video (1080p)</span>
        </button>
      </div>
    </div>
  );
};
