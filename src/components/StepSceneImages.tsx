import React, { useState } from 'react';
import { VideoProject, Scene, VisualEffect, KenBurnsEffect, TransitionType } from '../types/editor';
import { STOCK_IMAGES, STOCK_CATEGORIES } from '../data/stockLibrary';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  Sliders,
  Camera,
  Layers,
  Wand2,
} from 'lucide-react';

interface StepSceneImagesProps {
  project: VideoProject;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onAutoSyncScenes: () => void;
  onSelectScene: (scene: Scene) => void;
  selectedSceneId: string | null;
}

export const StepSceneImages: React.FC<StepSceneImagesProps> = ({
  project,
  onUpdateProject,
  onPrevStep,
  onNextStep,
  onAutoSyncScenes,
  onSelectScene,
  selectedSceneId,
}) => {
  const [stockModalSceneId, setStockModalSceneId] = useState<string | null>(null);
  const [selectedStockCat, setSelectedStockCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Batch Image Upload: drops multiple images and auto-assigns sequentially
  const handleBatchImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const readers = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((dataUrls) => {
      onUpdateProject((prev) => {
        const newScenes = [...prev.scenes];
        dataUrls.forEach((url, idx) => {
          if (idx < newScenes.length) {
            newScenes[idx] = { ...newScenes[idx], imageUrl: url };
          } else {
            const last = newScenes[newScenes.length - 1];
            const start = last ? last.endTime : 0;
            const dur = 4.5;
            newScenes.push({
              id: `scene-${Date.now()}-${idx}`,
              sceneNumber: newScenes.length + 1,
              title: `Scene ${newScenes.length + 1}`,
              narration: 'Narration for this scene...',
              startTime: start,
              endTime: start + dur,
              duration: dur,
              imageUrl: url,
              visualEffect: 'cinematic',
              kenBurns: idx % 2 === 0 ? 'zoom-in' : 'pan-right',
              transition: 'crossfade',
              captions: [{ id: `c-${Date.now()}`, text: 'CAPTION BEAT', relativeStart: 0, duration: dur }],
            });
          }
        });
        return { ...prev, scenes: newScenes };
      });
    });
  };

  const handleSingleImageUpload = (sceneId: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onUpdateProject((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, imageUrl: dataUrl } : s)),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleApplyStockToScene = (stockUrl: string) => {
    if (!stockModalSceneId) return;
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === stockModalSceneId ? { ...s, imageUrl: stockUrl } : s)),
    }));
    setStockModalSceneId(null);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return;
    onUpdateProject((prev) => {
      const filtered = prev.scenes.filter((s) => s.id !== sceneId);
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

  const handleAddScene = () => {
    onUpdateProject((prev) => {
      const last = prev.scenes[prev.scenes.length - 1];
      const start = last ? last.endTime : 0;
      const dur = 4.5;
      const newScene: Scene = {
        id: `scene-${Date.now()}`,
        sceneNumber: prev.scenes.length + 1,
        title: `Scene ${prev.scenes.length + 1}`,
        narration: 'Next narration line...',
        startTime: start,
        endTime: start + dur,
        duration: dur,
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80',
        visualEffect: 'cinematic',
        kenBurns: 'zoom-in',
        transition: 'crossfade',
        captions: [{ id: `c-${Date.now()}`, text: 'NEW SCENE', relativeStart: 0, duration: dur }],
      };
      return { ...prev, scenes: [...prev.scenes, newScene] };
    });
  };

  const updateSceneField = (sceneId: string, field: keyof Scene, value: any) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, [field]: value } : s)),
    }));
  };

  const VISUAL_EFFECTS: { id: VisualEffect; label: string }[] = [
    { id: 'none', label: 'Original' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'warm_film', label: 'Warm 35mm' },
    { id: 'moody_cold', label: 'Moody Cold' },
    { id: 'noir', label: 'Noir B&W' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
    { id: 'vintage', label: 'Vintage Retro' },
  ];

  const KEN_BURNS: { id: KenBurnsEffect; label: string }[] = [
    { id: 'zoom-in', label: 'Zoom In' },
    { id: 'zoom-out', label: 'Zoom Out' },
    { id: 'pan-left', label: 'Pan Left' },
    { id: 'pan-right', label: 'Pan Right' },
    { id: 'float', label: 'Dynamic Float' },
    { id: 'none', label: 'Static' },
  ];

  const TRANSITIONS: { id: TransitionType; label: string }[] = [
    { id: 'crossfade', label: 'Crossfade' },
    { id: 'flash_white', label: 'White Flash Dip' },
    { id: 'slide', label: 'Slide Left' },
    { id: 'blur_dissolve', label: 'Blur Dissolve' },
    { id: 'none', label: 'Hard Cut' },
  ];

  const filteredStock = STOCK_IMAGES.filter((item) => {
    const matchCat = selectedStockCat === 'All' || item.category === selectedStockCat;
    const matchQ =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQ;
  });

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
            2
          </span>
          <h2 className="text-base font-bold text-white">
            Scene Images, Timings & Visual Effects
          </h2>
        </div>
        <p className="text-xs text-gray-400">
          Match visuals to spoken sentences, apply cinematic filters, camera motion, and smooth transitions.
        </p>
      </div>

      {/* Action Bar: Batch Upload & Auto Sync */}
      <div className="p-4 rounded-xl bg-[#0D121C] border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <label className="cursor-pointer w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition">
          <Upload className="w-3.5 h-3.5" />
          <span>Batch Upload Images (Auto-Fill All Scenes)</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleBatchImageUpload(e.target.files)}
            className="hidden"
          />
        </label>

        <button
          onClick={onAutoSyncScenes}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto-Fit Scene Timings to Voiceover</span>
        </button>
      </div>

      {/* Scene List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="font-semibold text-gray-300">
            {project.scenes.length} Video Scenes
          </span>
          <button
            onClick={handleAddScene}
            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Scene</span>
          </button>
        </div>

        <div className="space-y-3">
          {project.scenes.map((scene) => {
            const isSelected = selectedSceneId === scene.id;

            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene)}
                className={`p-3.5 rounded-xl border transition flex flex-col gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-red-950/20 border-red-500/70 ring-1 ring-red-500/30'
                    : 'bg-[#0D121C] border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Upper row: Thumbnail + Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-gray-800 group">
                      <img
                        src={scene.imageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                        <label className="cursor-pointer p-1 rounded bg-red-600 text-white text-[9px]">
                          <Upload className="w-3 h-3" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSingleImageUpload(scene.id, e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStockModalSceneId(scene.id);
                          }}
                          className="p-1 rounded bg-gray-800 text-white text-[9px]"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="absolute bottom-0 left-0 bg-black/85 text-[9px] font-mono font-bold text-white px-1">
                        S{scene.sceneNumber}
                      </span>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {scene.title}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800">
                          {scene.startTime.toFixed(1)}s - {scene.endTime.toFixed(1)}s
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                        "{scene.narration}"
                      </p>
                    </div>
                  </div>

                  {/* Scene Duration and Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-gray-950 px-2 py-1 rounded border border-gray-800">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="font-mono text-xs text-white">
                        {scene.duration.toFixed(1)}s
                      </span>
                    </div>

                    {project.scenes.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScene(scene.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-gray-800"
                        title="Delete scene"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lower row: Visual Filters, Camera Movement & Transition Effects */}
                <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Visual Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-gray-400">Filter:</span>
                    <select
                      value={scene.visualEffect || 'none'}
                      onChange={(e) => updateSceneField(scene.id, 'visualEffect', e.target.value)}
                      className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                    >
                      {VISUAL_EFFECTS.map((ef) => (
                        <option key={ef.id} value={ef.id}>
                          {ef.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Camera Movement */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-gray-400">Motion:</span>
                    <select
                      value={scene.kenBurns}
                      onChange={(e) => updateSceneField(scene.id, 'kenBurns', e.target.value)}
                      className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                    >
                      {KEN_BURNS.map((kb) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transition */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-gray-400">Transition:</span>
                    <select
                      value={scene.transition}
                      onChange={(e) => updateSceneField(scene.id, 'transition', e.target.value)}
                      className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                    >
                      {TRANSITIONS.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          {tr.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrevStep}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Script</span>
        </button>

        <button
          onClick={onNextStep}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-600/20 transition active:scale-95"
        >
          <span>Next: Captions & Music</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stock Library Modal */}
      {stockModalSceneId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                Choose High-Res Stock Visual
              </h3>
              <button
                onClick={() => setStockModalSceneId(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-gray-950 border-b border-gray-800 flex items-center gap-1.5 overflow-x-auto">
              {STOCK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedStockCat(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    selectedStockCat === cat
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1">
              {filteredStock.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleApplyStockToScene(item.url)}
                  className="aspect-video relative rounded-xl overflow-hidden border border-gray-800 cursor-pointer group hover:border-emerald-500 transition"
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[10px] font-semibold text-white truncate">
                      {item.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
