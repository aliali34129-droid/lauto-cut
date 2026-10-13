import React, { useState } from 'react';
import { VideoProject, Scene } from '../types/editor';
import { parseScriptWithAI, buildScenesFromAI } from '../services/geminiService';
import { STOCK_IMAGES } from '../data/stockLibrary';
import {
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  X,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

interface ScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScenes: (newScenes: Scene[], newTitle?: string) => void;
}

export const ScriptImportModal: React.FC<ScriptImportModalProps> = ({
  isOpen,
  onClose,
  onApplyScenes,
}) => {
  const [scriptText, setScriptText] = useState(
    `Did you know that the world's most successful YouTube channels don't just rely on luck?
They follow a strict mathematical blueprint for high viewer retention.
Every three to five seconds, the visual changes with a subtle cinematic pan to re-engage the viewer's dopamine.
When you combine high-stakes storytelling with automated visual pacing, watch time skyrockets.
In this breakdown, we reveal the exact three-step framework used by eight-figure content empires.`
  );
  const [visualStyle, setVisualStyle] = useState(
    'Cinematic Documentary, sleek 8k photorealistic'
  );
  const [pacingHint, setPacingHint] = useState<number>(30); // ~30s target
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleGenerateScenes = async () => {
    if (!scriptText.trim()) {
      setError('Please enter or paste your script first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedResult(null);

    try {
      const response = await parseScriptWithAI(scriptText, pacingHint, visualStyle);
      setParsedResult(response);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to parse script with AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult || !parsedResult.scenes) return;

    // Pick diverse stock images as fallbacks
    const sampleStock = STOCK_IMAGES.map((s) => s.url);
    const generatedScenes = buildScenesFromAI(parsedResult.scenes, sampleStock);

    onApplyScenes(generatedScenes, parsedResult.videoTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                AI Script to Scene Breakdown
              </h3>
              <p className="text-[11px] text-gray-400">
                Breaks script into timed scenes, visual cues, and caption beats
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Script Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <span>Video Script / Narration Text</span>
              </label>
              <span className="text-[11px] text-gray-500 font-mono">
                {scriptText.trim().split(/\s+/).filter(Boolean).length} words (~
                {Math.round(scriptText.trim().split(/\s+/).filter(Boolean).length / 2.6)}s)
              </span>
            </div>
            <textarea
              rows={6}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste your YouTube video script here (in English, Urdu, or any language)..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
            />
          </div>

          {/* Visual Style & Pacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Visual Niche & Atmosphere
              </label>
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Cinematic Documentary, sleek 8k photorealistic">
                  Cinematic Documentary (High Contrast)
                </option>
                <option value="Luxury Wealth, Billionaire lifestyle, Skyscrapers">
                  Finance & Luxury Wealth
                </option>
                <option value="AI Neural Networks, Cyberpunk, Futuristic Tech">
                  AI & Futuristic Tech
                </option>
                <option value="Dark Mystery, True Crime, Investigative Archives">
                  Dark Mystery & True Crime
                </option>
                <option value="Epic Cosmic Universe, Space Science">
                  Space & Science
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Pacing & Retention Target
              </label>
              <select
                value={pacingHint}
                onChange={(e) => setPacingHint(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={20}>High Speed (Shorts / 20-30s)</option>
                <option value={45}>Medium Video (Long Form Hook / 45s)</option>
                <option value={60}>Extended Breakdown (60s+)</option>
              </select>
            </div>
          </div>

          {/* AI Generation button */}
          <button
            onClick={handleGenerateScenes}
            disabled={isLoading || !scriptText.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Script & Timing Scenes with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Generate Synchronized Scenes with AI</span>
              </>
            )}
          </button>

          {/* Parsed Preview */}
          {parsedResult && parsedResult.scenes && (
            <div className="mt-4 p-4 rounded-xl bg-gray-950 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    Generated Breakdown
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {parsedResult.videoTitle}
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-mono">
                  {parsedResult.scenes.length} Scenes
                </span>
              </div>

              {parsedResult.hookAnalysis && (
                <p className="text-[11px] text-gray-400 italic bg-gray-900/60 p-2 rounded border border-gray-800">
                  <Lightbulb className="w-3 h-3 inline text-amber-400 mr-1" />
                  {parsedResult.hookAnalysis}
                </p>
              )}

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {parsedResult.scenes.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          Scene {s.sceneNumber}: {s.title}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 bg-black/60 px-1 rounded">
                          {s.duration}s
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 mt-1">
                        "{s.narration}"
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded shrink-0">
                      {s.kenBurns}
                    </span>
                  </div>
                ))}
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
            onClick={handleApply}
            disabled={!parsedResult}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply Scenes to Timeline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
