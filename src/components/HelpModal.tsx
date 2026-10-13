import React from 'react';
import {
  HelpCircle,
  X,
  Sparkles,
  FileText,
  Upload,
  Mic,
  Music,
  Type,
  CheckCircle,
  Sliders,
  Palette,
  Film,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                YouTube Automation Studio Guide
              </h3>
              <p className="text-[11px] text-gray-400">
                Complete walkthrough: Script, Voiceover, Images, Captions & HD Export
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-gray-300">
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-blue-950/30 to-purple-950/30 border border-red-500/30">
            <h4 className="font-bold text-sm text-white flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-red-400" />
              <span>How AutoTube Studio Works</span>
            </h4>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              AutoTube Studio is designed for automated YouTube cash-cow channels, video essays, and documentary creators. Provide your script, visuals, and voiceover — the app automatically synchronizes all imagery scene-by-scene, animates dynamic captions, and mixes background music with intelligent speech ducking.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                1
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  Script & Voiceover
                </h5>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                  Paste your video script and click <strong>AI Auto-Breakdown</strong>. Gemini AI divides your script into distinct scenes with estimated durations. Upload your recorded MP3/WAV file or generate a realistic studio AI voice with <strong>Gemini TTS</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                2
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  Batch Images & Visual Effects
                </h5>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                  Click <strong>Batch Upload Images</strong> to drop multiple photos at once. They will automatically fill each scene sequentially. Choose cinematic filters (Cinematic, Warm 35mm, Moody Cold, Noir, Cyberpunk) and Ken Burns camera movements (Zoom In, Pan Left, Float) for high viewer retention.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                3
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  20+ Caption Styles & Color Studio
                </h5>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                  Select from over 22 viral presets (MrBeast Impact, Hormozi Highlighter, TikTok Karaoke, Documentary, Cyberpunk Neon). Open the <strong>Manual Color & Font Studio</strong> to customize text color, highlight color, outline width, and vertical position. If you prefer no subtitles, click <strong>Captions Disabled</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                4
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  Dedicated Captions Timeline Layer
                </h5>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                  Under the video player, you will find a dedicated <strong>Captions Layer</strong> strip. Click any segment to edit the words, start time, and duration. Add new caption blocks or delete segments anytime.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                5
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  Trending Background Music & Auto-Ducking
                </h5>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                  Choose from 6 royalty-free niche tracks (Dark Mystery, Lofi Chill, Phonk Bass, Cinematic Ambient). Smart Voice Auto-Ducking automatically lowers music volume by 75% whenever narration is speaking.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0B0F17] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition"
          >
            Got it, Let's Create!
          </button>
        </div>
      </div>
    </div>
  );
};
