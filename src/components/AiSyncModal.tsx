import React, { useState } from 'react';
import { VideoProject, Scene } from '../types/editor';
import { smartAiSyncWithVoiceAndScript } from '../services/geminiService';
import {
  Sparkles,
  X,
  FileText,
  Mic,
  Image as ImageIcon,
  Check,
  Loader2,
  Clock,
  Zap,
  Sliders,
  Layers,
} from 'lucide-react';

interface AiSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  showToast: (msg: string) => void;
}

export const AiSyncModal: React.FC<AiSyncModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  showToast,
}) => {
  // Pre-fill script text from scenes or allow editing
  const [scriptText, setScriptText] = useState(
    () => project.scenes.map((s) => s.narration).filter(Boolean).join('\n\n') || ''
  );

  const [targetDuration, setTargetDuration] = useState<number>(
    () =>
      project.audio.voiceoverDuration ||
      project.scenes.reduce((acc, s) => acc + s.duration, 0) ||
      30.0
  );

  const [pacingStyle, setPacingStyle] = useState<string>(
    'YouTube Automation High Retention'
  );

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const totalWords = scriptText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((totalWords / 2.5) * 10) / 10;

  const handleRunAiSync = async () => {
    setIsLoading(true);
    try {
      const result = await smartAiSyncWithVoiceAndScript(
        scriptText,
        project.scenes,
        targetDuration,
        pacingStyle
      );

      onUpdateProject((prev) => ({
        ...prev,
        scenes: result.scenes,
        timelineCaptions:
          result.timelineCaptions && result.timelineCaptions.length > 0
            ? result.timelineCaptions
            : prev.timelineCaptions,
        captionStyle: { ...prev.captionStyle, enabled: true },
      }));

      showToast(
        `✓ Gemini AI aligned all ${result.scenes.length} image scenes to ${targetDuration.toFixed(1)}s voiceover!`
      );
      onClose();
    } catch (err: any) {
      alert('AI Sync Error: ' + (err.message || 'Failed to sync with Gemini.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0E1017] border border-cyan-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 bg-[#121520] border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2 font-['Cabinet_Grotesk']">
                <span>Gemini AI Scene-to-Voice Smart Alignment</span>
                <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-800">
                  PRO AI
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Aligns each image scene with spoken voiceover and script cadence with microsecond precision.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-300 flex-1">
          {/* Section 1: Video Script */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. Spoken Narration Script</span>
              </label>
              <span className="font-mono text-[10px] text-gray-400">
                {totalWords} words (~{estimatedSeconds}s spoken)
              </span>
            </div>
            <textarea
              rows={5}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="w-full bg-[#08090E] border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 leading-relaxed font-sans placeholder-gray-600 resize-none shadow-inner"
              placeholder="Paste your voiceover script here..."
            />
            <p className="text-[10px] text-gray-500">
              Gemini reads this script to understand semantic transitions and assign exact image display times.
            </p>
          </div>

          {/* Section 2: Voiceover Target Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-[#08090E] rounded-xl border border-gray-800 space-y-1.5">
              <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Mic className="w-3.5 h-3.5 text-purple-400" />
                <span>2. Voiceover Audio Duration</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="3.0"
                  max="600.0"
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(parseFloat(e.target.value) || 10.0)}
                  className="w-24 bg-gray-950 border border-gray-700 px-2 py-1 rounded-lg text-white font-mono text-xs font-bold outline-none focus:border-purple-400"
                />
                <span className="text-[11px] text-purple-400 font-bold font-mono">seconds</span>
              </div>
              <p className="text-[10px] text-gray-500">
                {project.audio.voiceoverUrl
                  ? `Detected from uploaded file: ${project.audio.voiceoverDuration.toFixed(1)}s`
                  : 'Target length for all combined visual scenes.'}
              </p>
            </div>

            {/* Section 3: Pacing Style */}
            <div className="p-3 bg-[#08090E] rounded-xl border border-gray-800 space-y-1.5">
              <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>3. AI Pacing & Retention Mode</span>
              </label>
              <select
                value={pacingStyle}
                onChange={(e) => setPacingStyle(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-1.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="YouTube Automation High Retention">
                  Dynamic YouTube Automation (~2.8 wps, Punchy)
                </option>
                <option value="Documentary Deep Dive">
                  Documentary Deep Dive (~2.2 wps, Dramatic Pauses)
                </option>
                <option value="Fast Paced Shorts">
                  Fast Viral Shorts (~3.4 wps, Rapid Cuts)
                </option>
              </select>
              <p className="text-[10px] text-gray-500">
                Controls Ken Burns speed, comma/period pause weighting, and cuts.
              </p>
            </div>
          </div>

          {/* Section 4: Visual Images Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>4. Visual Images ({project.scenes.length} Scenes to Synchronize)</span>
              </span>
              <span className="text-[10px] text-gray-500">
                Sequence is preserved 1:1
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 bg-[#08090E] rounded-xl border border-gray-800">
              {project.scenes.map((sc, i) => (
                <div key={sc.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-800 bg-black">
                  <img src={sc.imageUrl} alt={sc.title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-center text-white py-0.2 font-bold">
                    S{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 bg-[#121520] border-t border-gray-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Powered by Gemini 3.8 Flash Multimodal Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition"
            >
              Cancel
            </button>

            <button
              onClick={handleRunAiSync}
              disabled={isLoading || project.scenes.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin fill-black" />
                  <span>Aligning Images with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Run AI Scene-to-Voice Sync</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
