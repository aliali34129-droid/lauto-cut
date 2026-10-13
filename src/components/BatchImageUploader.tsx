import React, { useState } from 'react';
import { VideoProject, Scene } from '../types/editor';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  ArrowDown,
  ArrowUp,
  Trash2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface BatchImageUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
}

interface UploadedItem {
  id: string;
  name: string;
  dataUrl: string;
}

export const BatchImageUploader: React.FC<BatchImageUploaderProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedItem[]>([]);
  const [autoExpandScenes, setAutoExpandScenes] = useState(true);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newItems: UploadedItem[] = [];
    const readers = Array.from(files).map((file, idx) => {
      return new Promise<void>((resolve) => {
        if (!file.type.startsWith('image/')) {
          resolve();
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            newItems.push({
              id: `batch-${Date.now()}-${idx}`,
              name: file.name,
              dataUrl: result,
            });
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(() => {
      setUploadedImages((prev) => [...prev, ...newItems]);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= uploadedImages.length) return;

    const list = [...uploadedImages];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setUploadedImages(list);
  };

  const removeItem = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const applyImagesToScenes = () => {
    if (uploadedImages.length === 0) return;

    onUpdateProject((prev) => {
      const newScenes = [...prev.scenes];

      // Assign uploaded images to existing scenes 1-by-1
      uploadedImages.forEach((imgItem, idx) => {
        if (idx < newScenes.length) {
          newScenes[idx] = {
            ...newScenes[idx],
            imageUrl: imgItem.dataUrl,
            imageAlt: imgItem.name,
          };
        } else if (autoExpandScenes) {
          // If user uploaded more images than scenes, add new scenes automatically!
          const lastScene = newScenes[newScenes.length - 1];
          const start = lastScene ? lastScene.endTime : 0;
          const duration = 5.0;
          const end = start + duration;

          newScenes.push({
            id: `scene-${Date.now()}-${idx}`,
            sceneNumber: newScenes.length + 1,
            title: `Scene ${newScenes.length + 1}`,
            narration: 'Narration for this visual scene...',
            startTime: start,
            endTime: end,
            duration: duration,
            imageUrl: imgItem.dataUrl,
            imageAlt: imgItem.name,
            kenBurns: idx % 2 === 0 ? 'zoom-in' : 'pan-right',
            transition: 'crossfade',
            captions: [
              {
                id: `cap-${Date.now()}-${idx}`,
                text: 'DYNAMIC CAPTION',
                relativeStart: 0,
                duration: duration,
              },
            ],
          });
        }
      });

      return { ...prev, scenes: newScenes };
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Batch Image Uploader & Scene-by-Scene Sync
              </h3>
              <p className="text-[11px] text-gray-400">
                Upload all your images together; they will automatically map to each scene in order
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-700 hover:border-emerald-500/80 rounded-2xl p-6 text-center bg-gray-950/60 transition group cursor-pointer relative"
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-200">
                Drag & drop all your video images here
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Select 5, 10, or 20+ images at once (PNG, JPG, WebP)
              </p>
            </div>
          </div>

          {/* Settings: Auto Expand */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs">
            <div>
              <span className="font-semibold text-gray-300">
                Auto-create scenes if extra images uploaded
              </span>
              <p className="text-[11px] text-gray-500">
                If you upload 8 images for 5 scenes, automatically create 3 extra scenes
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoExpandScenes}
              onChange={(e) => setAutoExpandScenes(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* List of uploaded images with scene assignments */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-semibold text-gray-300">
                  {uploadedImages.length} Images Ready to Assign
                </span>
                <button
                  onClick={() => setUploadedImages([])}
                  className="text-red-400 hover:text-red-300 text-[11px]"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {uploadedImages.map((img, idx) => {
                  const targetScene = project.scenes[idx];
                  return (
                    <div
                      key={img.id}
                      className="p-2 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {/* Thumbnail */}
                        <div className="w-12 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-gray-800">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Assignment Details */}
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                              → Scene {idx + 1}
                            </span>
                            <span className="font-medium text-gray-200 truncate text-[11px]">
                              {targetScene ? targetScene.title : `New Scene ${idx + 1}`}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">
                            {img.name}
                          </p>
                        </div>
                      </div>

                      {/* Reorder and remove buttons */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {idx > 0 && (
                          <button
                            onClick={() => moveItem(idx, 'up')}
                            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < uploadedImages.length - 1 && (
                          <button
                            onClick={() => moveItem(idx, 'down')}
                            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-gray-800"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0B0F17] flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={applyImagesToScenes}
            disabled={uploadedImages.length === 0}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Map Images to All Scenes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
