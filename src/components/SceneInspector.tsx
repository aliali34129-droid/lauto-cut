import React, { useState } from 'react';
import { Scene, KenBurnsEffect, TransitionType, VideoProject } from '../types/editor';
import { STOCK_IMAGES, STOCK_CATEGORIES, StockImageItem } from '../data/stockLibrary';
import {
  Image as ImageIcon,
  Clock,
  Sparkles,
  Upload,
  Layers,
  Film,
  Camera,
  Trash2,
  Copy,
  Plus,
  X,
  Type,
  Search,
} from 'lucide-react';

interface SceneInspectorProps {
  scene: Scene | null;
  project: VideoProject;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onClose: () => void;
  onTimeSeek: (time: number) => void;
}

export const SceneInspector: React.FC<SceneInspectorProps> = ({
  scene,
  project,
  onUpdateProject,
  onClose,
  onTimeSeek,
}) => {
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedStockCategory, setSelectedStockCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!scene) {
    return (
      <div className="w-80 sm:w-96 bg-[#0B0F17] border-l border-gray-800/80 p-6 flex flex-col items-center justify-center text-center text-gray-500 text-xs">
        <Film className="w-8 h-8 text-gray-700 mb-2" />
        <p className="font-medium text-gray-400">No Scene Selected</p>
        <p className="mt-1 text-[11px]">
          Click any scene block in the timeline below to customize its image, timing, motion, and captions.
        </p>
      </div>
    );
  }

  const updateCurrentScene = (updater: (s: Scene) => Scene) => {
    onUpdateProject((prev) => {
      const idx = prev.scenes.findIndex((s) => s.id === scene.id);
      if (idx === -1) return prev;

      const newScenes = [...prev.scenes];
      newScenes[idx] = updater(newScenes[idx]);

      // Recalculate start and end times
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          updateCurrentScene((s) => ({
            ...s,
            imageUrl: result,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectStockImage = (stock: StockImageItem) => {
    updateCurrentScene((s) => ({
      ...s,
      imageUrl: stock.url,
      imageAlt: stock.title,
    }));
    setShowStockModal(false);
  };

  const handleDeleteScene = () => {
    if (project.scenes.length <= 1) {
      alert('Video must have at least one scene.');
      return;
    }
    onUpdateProject((prev) => {
      const filtered = prev.scenes.filter((s) => s.id !== scene.id);
      let accum = 0;
      const recalculated = filtered.map((s, idx) => {
        const start = Math.round(accum * 10) / 10;
        accum += s.duration;
        const end = Math.round(accum * 10) / 10;
        return {
          ...s,
          sceneNumber: idx + 1,
          startTime: start,
          endTime: end,
        };
      });
      return { ...prev, scenes: recalculated };
    });
    onClose();
  };

  const handleDuplicateScene = () => {
    onUpdateProject((prev) => {
      const idx = prev.scenes.findIndex((s) => s.id === scene.id);
      if (idx === -1) return prev;

      const clone: Scene = {
        ...scene,
        id: `scene-${Date.now()}`,
        title: `${scene.title} (Copy)`,
      };

      const newScenes = [...prev.scenes];
      newScenes.splice(idx + 1, 0, clone);

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

  const filteredStock = STOCK_IMAGES.filter((item) => {
    const matchesCategory =
      selectedStockCategory === 'All' || item.category === selectedStockCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  return (
    <aside className="w-80 sm:w-96 bg-[#0B0F17] border-l border-gray-800/80 flex flex-col h-full overflow-y-auto select-none">
      {/* Header */}
      <div className="h-12 px-4 border-b border-gray-800/80 flex items-center justify-between text-xs sticky top-0 bg-[#0B0F17] z-20">
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded-md bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-[10px]">
            {scene.sceneNumber}
          </span>
          <span className="font-bold text-gray-200">Scene Inspector</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onTimeSeek(scene.startTime)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] font-mono transition"
            title="Jump playhead to this scene"
          >
            {scene.startTime.toFixed(1)}s
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Title & Scene Number */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Scene Title
          </label>
          <input
            type="text"
            value={scene.title}
            onChange={(e) =>
              updateCurrentScene((s) => ({ ...s, title: e.target.value }))
            }
            className="w-full bg-gray-900 border border-gray-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Scene Image Preview & Replacer */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              Scene Image
            </label>
          </div>

          <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-800 bg-black group shadow-md">
            <img
              src={scene.imageUrl}
              alt={scene.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
              <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold flex items-center gap-1 shadow">
                <Upload className="w-3 h-3" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowStockModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-bold flex items-center gap-1 shadow"
              >
                <Search className="w-3 h-3" />
                <span>Stock Library</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px]">
            <button
              onClick={() => setShowStockModal(true)}
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Choose from YT Stock Library</span>
            </button>
            <label className="cursor-pointer text-gray-400 hover:text-gray-200">
              Replace file
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Narration Script */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Spoken Narration (Script)
          </label>
          <textarea
            rows={3}
            value={scene.narration}
            onChange={(e) => {
              const text = e.target.value;
              updateCurrentScene((s) => ({
                ...s,
                narration: text,
                captions: [
                  {
                    id: `cap-${Date.now()}`,
                    text: text,
                    relativeStart: 0,
                    duration: s.duration,
                  },
                ],
              }));
            }}
            className="w-full bg-gray-900 border border-gray-700/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
            placeholder="What the voiceover says during this scene..."
          />
          <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
            <span>
              {scene.narration.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <span>
              Pacing: ~{(scene.narration.trim().split(/\s+/).filter(Boolean).length / (scene.duration || 1)).toFixed(1)} wps
            </span>
          </div>
        </div>

        {/* Scene Duration Slider */}
        <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Scene Duration
            </span>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="60"
                value={scene.duration}
                onChange={(e) => {
                  const val = Math.max(1.0, parseFloat(e.target.value) || 1.0);
                  updateCurrentScene((s) => ({ ...s, duration: val }));
                }}
                className="w-16 bg-gray-950 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-right text-white font-mono"
              />
              <span className="text-[11px] text-gray-400">sec</span>
            </div>
          </div>

          <input
            type="range"
            min="1.5"
            max="15.0"
            step="0.1"
            value={scene.duration}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateCurrentScene((s) => ({ ...s, duration: val }));
            }}
            className="w-full accent-red-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Fast hook (2s)</span>
            <span>Standard (5s)</span>
            <span>Slow take (15s)</span>
          </div>
        </div>

        {/* Motion: Ken Burns Camera Effect */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            Ken Burns Camera Movement
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'zoom-in', label: 'Zoom In' },
              { id: 'zoom-out', label: 'Zoom Out' },
              { id: 'pan-left', label: 'Pan Left' },
              { id: 'pan-right', label: 'Pan Right' },
              { id: 'none', label: 'Static' },
            ].map((k) => (
              <button
                key={k.id}
                onClick={() =>
                  updateCurrentScene((s) => ({
                    ...s,
                    kenBurns: k.id as KenBurnsEffect,
                  }))
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                  scene.kenBurns === k.id
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transition to Next Scene */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Scene Transition
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'crossfade', label: 'Crossfade (Smooth)' },
              { id: 'none', label: 'Hard Cut (Instant)' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  updateCurrentScene((s) => ({
                    ...s,
                    transition: t.id as TransitionType,
                  }))
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                  scene.transition === t.id
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Dynamic Captions Segment Preview */}
        <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-yellow-400" />
              Dynamic Subtitle Chunks
            </span>
          </div>

          <div className="space-y-1.5">
            {(scene.captions || []).map((cap, cIdx) => (
              <div
                key={cap.id || cIdx}
                className="flex items-center space-x-1.5 bg-gray-950 p-1.5 rounded border border-gray-800"
              >
                <input
                  type="text"
                  value={cap.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    updateCurrentScene((s) => {
                      const newCaps = [...(s.captions || [])];
                      newCaps[cIdx] = { ...newCaps[cIdx], text: newText };
                      return { ...s, captions: newCaps };
                    });
                  }}
                  className="flex-1 bg-transparent text-xs text-yellow-300 font-semibold focus:outline-none"
                />
                <span className="text-[10px] font-mono text-gray-500">
                  {cap.relativeStart.toFixed(1)}s
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions: Duplicate / Delete */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={handleDuplicateScene}
            className="flex items-center space-x-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={handleDeleteScene}
            className="flex items-center space-x-1 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 px-3 py-1.5 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Scene</span>
          </button>
        </div>
      </div>

      {/* Stock Library Modal */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  YouTube Automation Stock Visuals
                </h3>
              </div>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category tabs */}
            <div className="p-3 bg-gray-950 border-b border-gray-800 flex items-center gap-1.5 overflow-x-auto">
              {STOCK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedStockCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    selectedStockCategory === cat
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
              {filteredStock.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectStockImage(item)}
                  className="aspect-video relative rounded-xl overflow-hidden border border-gray-800 cursor-pointer group hover:border-emerald-500 transition shadow-sm"
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[11px] font-semibold text-white truncate">
                      {item.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
