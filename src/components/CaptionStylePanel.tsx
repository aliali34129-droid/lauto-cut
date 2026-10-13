import React from 'react';
import { VideoProject, CaptionPreset, CaptionPresetId } from '../types/editor';
import {
  Type,
  Sparkles,
  Palette,
  AlignLeft,
  X,
  Check,
  Eye,
} from 'lucide-react';

interface CaptionStylePanelProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
}

export const CaptionStylePanel: React.FC<CaptionStylePanelProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  if (!isOpen) return null;

  const style = project.captionStyle;

  const updateStyle = (patch: Partial<typeof style>) => {
    onUpdateProject((prev) => ({
      ...prev,
      captionStyle: { ...prev.captionStyle, ...patch },
    }));
  };

  const PRESETS: { id: CaptionPresetId; title: string; desc: string; sample: string }[] = [
    {
      id: 'mrbeast_impact',
      title: 'MrBeast / Hormozi Bold',
      desc: 'High-energy yellow highlight, thick dark stroke, bouncy pop',
      sample: 'WHAT IF EVERYTHING',
    },
    {
      id: 'documentary_cinematic',
      title: 'Documentary Minimalist',
      desc: 'Elegant clean typography inside dark translucent glass pill',
      sample: 'The hidden formula of wealth',
    },
    {
      id: 'cyberpunk_neon',
      title: 'Cyber Neon Glow',
      desc: 'Electric glowing cyan font for tech and futuristic niches',
      sample: 'NEURAL SYSTEM ACTIVATED',
    },
    {
      id: 'ali_abdaal',
      title: 'Clean Minimalist Pill',
      desc: 'Simple crisp text with soft cinematic drop shadow',
      sample: 'Step by step breakdown',
    },
  ];

  const COLOR_PALETTES = [
    { name: 'Vibrant Yellow', hex: '#FFE600' },
    { name: 'Electric Cyan', hex: '#06B6D4' },
    { name: 'Emerald Green', hex: '#10B981' },
    { name: 'Fire Orange', hex: '#F97316' },
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Hot Pink', hex: '#EC4899' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                AI Dynamic Captions & Subtitles
              </h3>
              <p className="text-[11px] text-gray-400">
                Trending YouTube subtitle animations to maximize viewer watch-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Enable Toggle & Live Preview Box */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Enable On-Screen Captions
                </span>
                <p className="text-[11px] text-gray-400">
                  Renders animated subtitles directly on your exported video
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={style.enabled}
                  onChange={(e) => updateStyle({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500" />
              </label>
            </div>

            {/* Live Visual Preview */}
            <div className="h-20 bg-gradient-to-b from-gray-900 to-black rounded-lg border border-gray-800 flex items-center justify-center relative overflow-hidden">
              <span className="text-[9px] font-mono text-gray-600 absolute top-1.5 left-2">
                Live Subtitle Preview
              </span>

              {((style.preset as string).includes('hormozi') || (style.preset as string).includes('mrbeast')) && (
                <span
                  style={{
                    color: style.highlightColor,
                    textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                  }}
                  className="font-black text-lg tracking-wider font-['Cabinet_Grotesk'] uppercase"
                >
                  HIGH RETENTION HOOK
                </span>
              )}

              {(style.preset as string).includes('documentary') && (
                <div className="px-4 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-white font-semibold text-xs tracking-wide">
                  The secret algorithm of YouTube
                </div>
              )}

              {(style.preset as string).includes('cyber') && (
                <span className="font-extrabold text-sm text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] tracking-widest font-mono uppercase">
                  NEURAL NETWORK AUTOMATION
                </span>
              )}

              {!(style.preset as string).includes('hormozi') &&
                !(style.preset as string).includes('mrbeast') &&
                !(style.preset as string).includes('documentary') &&
                !(style.preset as string).includes('cyber') && (
                  <span className="font-bold text-sm text-white drop-shadow-md">
                    Clean modern typography
                  </span>
                )}
            </div>
          </div>

          {/* Preset Cards */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Select Caption Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESETS.map((p) => {
                const isSelected = style.preset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => updateStyle({ preset: p.id })}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-yellow-950/20 border-yellow-500 ring-1 ring-yellow-500/30'
                        : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">
                        {p.title}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-snug">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Palettes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-yellow-400" />
              Highlight Accent Color
            </label>
            <div className="flex items-center gap-2.5">
              {COLOR_PALETTES.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateStyle({ highlightColor: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                    style.highlightColor === c.hex
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B0F17]'
                      : ''
                  }`}
                  title={c.name}
                >
                  {style.highlightColor === c.hex && (
                    <Check className="w-3.5 h-3.5 text-black" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size & Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Font Size
              </label>
              <div className="grid grid-cols-4 gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => updateStyle({ fontSize: sz })}
                    className={`py-1 rounded text-[11px] font-bold uppercase transition ${
                      style.fontSize === sz
                        ? 'bg-yellow-500 text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Position
              </label>
              <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                {(['bottom', 'center', 'top'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateStyle({ position: pos })}
                    className={`py-1 rounded text-[11px] font-bold capitalize transition ${
                      style.position === pos
                        ? 'bg-yellow-500 text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Additional switches */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs">
            <span className="font-semibold text-gray-300">
              Force All-Caps (MRBEAST STYLE)
            </span>
            <input
              type="checkbox"
              checked={style.uppercase}
              onChange={(e) => updateStyle({ uppercase: e.target.checked })}
              className="w-4 h-4 accent-yellow-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0B0F17] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs transition"
          >
            Apply Captions
          </button>
        </div>
      </div>
    </div>
  );
};
