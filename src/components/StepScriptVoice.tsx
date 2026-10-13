import React, { useState } from 'react';
import { VideoProject, Scene } from '../types/editor';
import { parseScriptWithAI, generateTTSWithAI, buildScenesFromAI } from '../services/geminiService';
import { STOCK_IMAGES } from '../data/stockLibrary';
import { AudioEngine } from '../services/audioEngine';
import {
  FileText,
  Mic,
  Sparkles,
  Upload,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Music,
  Radio,
  Play,
  RotateCcw,
} from 'lucide-react';

interface StepScriptVoiceProps {
  project: VideoProject;
  audioEngine: AudioEngine;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onNextStep: () => void;
  onAutoSyncScenes: (duration?: number) => void;
}

export const StepScriptVoice: React.FC<StepScriptVoiceProps> = ({
  project,
  audioEngine,
  onUpdateProject,
  onNextStep,
  onAutoSyncScenes,
}) => {
  const [scriptInput, setScriptInput] = useState(() => {
    return project.scenes.map((s) => s.narration).join('\n\n') ||
      `Did you know that the top one percent of YouTube creators follow a strict blueprint for high viewer retention?
Every few seconds, the visual changes with a subtle cinematic pan to keep the audience engaged.
When you combine high-stakes storytelling with automated visual pacing, watch time skyrockets.
In this video, we break down the exact three-step formula.`;
  });

  const [isAiBreakingDown, setIsAiBreakingDown] = useState(false);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [audioMode, setAudioMode] = useState<'upload' | 'ai_tts'>('ai_tts');

  // Parse Script into Scenes using AI
  const handleAiBreakdown = async () => {
    if (!scriptInput.trim()) return;
    setIsAiBreakingDown(true);

    try {
      const response = await parseScriptWithAI(scriptInput);
      if (response && response.scenes) {
        const sampleStock = STOCK_IMAGES.map((s) => s.url);
        const newScenes = buildScenesFromAI(response.scenes, sampleStock);
        onUpdateProject((prev) => ({
          ...prev,
          title: response.videoTitle || prev.title,
          scenes: newScenes,
        }));
      }
    } catch (err: any) {
      alert('AI Script breakdown failed: ' + err.message);
    } finally {
      setIsAiBreakingDown(false);
    }
  };

  // Upload Custom Voiceover File
  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const tempAudio = new Audio();
    tempAudio.src = url;
    tempAudio.onloadedmetadata = () => {
      const duration = tempAudio.duration;
      audioEngine.setVoiceoverSource(url);

      onUpdateProject((prev) => ({
        ...prev,
        audio: {
          ...prev.audio,
          voiceoverUrl: url,
          voiceoverFileName: file.name,
          voiceoverDuration: duration,
        },
      }));

      onAutoSyncScenes(duration);
    };
  };

  // Generate AI Voiceover with Gemini TTS
  const handleGenerateAiVoice = async () => {
    const fullText = project.scenes.map((s) => s.narration).join(' ').trim() || scriptInput.trim();
    if (!fullText) return;

    setIsGeneratingTts(true);
    try {
      const res = await generateTTSWithAI(fullText, selectedVoice);
      const audioUrl = `data:audio/wav;base64,${res.audioBase64}`;

      const temp = new Audio();
      temp.src = audioUrl;
      temp.onloadedmetadata = () => {
        const duration = temp.duration || project.scenes.reduce((a, s) => a + s.duration, 0);
        audioEngine.setVoiceoverSource(audioUrl);

        onUpdateProject((prev) => ({
          ...prev,
          audio: {
            ...prev.audio,
            voiceoverUrl: audioUrl,
            voiceoverFileName: `AI_Voiceover_${res.voiceName}.wav`,
            voiceoverDuration: duration,
          },
        }));

        onAutoSyncScenes(duration);
      };
    } catch (err: any) {
      alert('Failed to generate AI voice: ' + err.message);
    } finally {
      setIsGeneratingTts(false);
    }
  };

  const totalWords = scriptInput.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round(totalWords / 2.5);

  return (
    <div className="space-y-6">
      {/* Step Title & Simple Explanation */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            1
          </span>
          <h2 className="text-base font-bold text-white">
            Script & Voiceover
          </h2>
        </div>
        <p className="text-xs text-gray-400">
          Paste your video script and provide the voiceover audio. AI will automatically divide it into scene-by-scene beats with exact timings.
        </p>
      </div>

      {/* 1. Script Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-gray-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Video Script
          </label>
          <span className="text-gray-500 font-mono text-[11px]">
            {totalWords} words (~{estimatedSeconds}s audio)
          </span>
        </div>

        <textarea
          rows={5}
          value={scriptInput}
          onChange={(e) => setScriptInput(e.target.value)}
          placeholder="Paste your YouTube video script here (in English, Urdu, Hindi or any language)..."
          className="w-full bg-[#0D121C] border border-gray-800 rounded-xl p-3.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
        />

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleAiBreakdown}
            disabled={isAiBreakingDown || !scriptInput.trim()}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            {isAiBreakingDown ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Dividing into scenes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Auto-Breakdown into Scenes</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-gray-500">
            Current: {project.scenes.length} Scenes
          </span>
        </div>
      </div>

      {/* 2. Voiceover Section */}
      <div className="p-4 rounded-xl bg-[#0D121C] border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-purple-400" />
            <div>
              <h3 className="text-xs font-bold text-white">Voiceover Audio</h3>
              <p className="text-[11px] text-gray-400">
                Upload your recorded audio or generate studio AI voice with 1 click
              </p>
            </div>
          </div>

          {/* Toggle between Upload & AI TTS */}
          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 text-[11px]">
            <button
              onClick={() => setAudioMode('upload')}
              className={`px-3 py-1 rounded font-medium transition ${
                audioMode === 'upload'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Upload Audio
            </button>
            <button
              onClick={() => setAudioMode('ai_tts')}
              className={`px-3 py-1 rounded font-medium transition ${
                audioMode === 'ai_tts'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              AI Voiceover
            </button>
          </div>
        </div>

        {/* Audio Mode 1: Upload */}
        {audioMode === 'upload' && (
          <div className="border border-dashed border-gray-700 hover:border-purple-500 rounded-xl p-4 text-center bg-gray-950/60 transition relative cursor-pointer">
            <input
              type="file"
              accept="audio/*"
              onChange={handleUploadAudio}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <Upload className="w-5 h-5 text-purple-400 mb-1" />
              <p className="text-xs font-bold text-gray-200">
                Click to upload your voiceover (MP3, WAV, M4A)
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Scenes will automatically snap to the exact voiceover duration!
              </p>
            </div>
          </div>
        )}

        {/* Audio Mode 2: AI Voiceover (Gemini TTS) */}
        {audioMode === 'ai_tts' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Zephyr', label: 'Zephyr', desc: 'Documentary Clear' },
                { id: 'Puck', label: 'Puck', desc: 'Energetic & Fast' },
                { id: 'Charon', label: 'Charon', desc: 'Deep & Serious' },
                { id: 'Kore', label: 'Kore', desc: 'Warm Narrative' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`p-2 rounded-lg border text-left transition ${
                    selectedVoice === v.id
                      ? 'bg-purple-600/30 border-purple-500 text-white'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <p className="font-bold text-[11px] text-white">{v.label}</p>
                  <p className="text-[9px] text-gray-500">{v.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateAiVoice}
              disabled={isGeneratingTts}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              {isGeneratingTts ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating AI Voiceover (Gemini TTS)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Voiceover & Auto-Sync All Scenes</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Current Audio Badge */}
        {project.audio.voiceoverDuration > 0 && (
          <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <div>
                <span className="font-bold text-white text-[11px]">
                  {project.audio.voiceoverFileName || 'Voiceover Audio Ready'}
                </span>
                <span className="text-gray-400 text-[10px] block">
                  Duration: {project.audio.voiceoverDuration.toFixed(1)}s (Perfect Sync)
                </span>
              </div>
            </div>

            <button
              onClick={() => onAutoSyncScenes(project.audio.voiceoverDuration)}
              className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded text-[10px] font-bold border border-purple-500/30 transition"
            >
              Re-Sync Timings
            </button>
          </div>
        )}
      </div>

      {/* Next Step Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNextStep}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-600/20 transition active:scale-95"
        >
          <span>Next: Set Scene Images</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
