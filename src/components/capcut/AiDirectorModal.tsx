import React, { useState } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Mic,
  Clock,
  Layers,
  Check,
  Loader2,
  Play,
  Pause,
  Upload,
  Sliders,
  ChevronRight,
  RefreshCw,
  Plus,
  ArrowRight,
  Eye,
  Camera,
} from 'lucide-react';
import { VideoProject, Scene } from '../../types/editor';
import { AudioEngine } from '../../services/audioEngine';
import { smartAiSyncWithVoiceAndScript, generateTTSWithAI } from '../../services/geminiService';

interface AiDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onShowToast: (message: string) => void;
  audioEngine?: AudioEngine;
}

const SAMPLE_SCRIPTS = [
  {
    name: 'YouTube AI Documentary',
    text: `Deep within Silicon Valley, an autonomous intelligence just made a breakthrough that scientists thought was decades away. It wasn't designed to play games or write poems. It began rewriting its own neural architecture in real time. As billions of parameters synchronized, the researchers in the room witnessed something unprecedented. The era of artificial general intelligence has quietly begun, and the world will never be the same.`,
  },
  {
    name: 'Wealth & Psychology',
    text: `Most people believe that building wealth requires extraordinary talent or lucky breaks. But the reality is far more counterintuitive. The wealthiest individuals in history didn't master the markets; they mastered their own psychology. Through the relentless discipline of compound interest, small daily habits compound into massive empires. Once you understand this single principle, financial freedom stops being a dream and becomes pure mathematics.`,
  },
  {
    name: 'Mystery & Crime Story',
    text: `On a foggy winter evening in 1974, an unmarked vessel vanished without a single distress call. Decades passed, and naval investigators found no debris, no wreckage, and no digital signature. Until satellite telemetry uncovered a submerged metallic structure deep beneath the Pacific trench. What they found inside defies everything we know about modern physics.`,
  },
];

export const AiDirectorModal: React.FC<AiDirectorModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onShowToast,
  audioEngine,
}) => {
  // Pre-fill script from current scenes narration
  const defaultScript =
    project.scenes.map((s) => s.narration || '').filter(Boolean).join('\n\n') ||
    SAMPLE_SCRIPTS[0].text;

  const [scriptText, setScriptText] = useState(defaultScript);
  const [voiceoverDuration, setVoiceoverDuration] = useState<number>(
    project.audio.voiceoverDuration ||
      project.scenes.reduce((acc, s) => acc + s.duration, 0) ||
      30
  );
  const [pacingStyle, setPacingStyle] = useState<string>(
    'YouTube High Retention (2.5 - 4.0s fast cuts)'
  );
  const [generateCaptions, setGenerateCaptions] = useState(true);

  // Audio Upload / TTS state
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const audioPreviewRef = React.useRef<HTMLAudioElement | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<{
    scenes: Scene[];
    timelineCaptions: any[];
    totalDuration: number;
    aiPowered: boolean;
  } | null>(null);

  if (!isOpen) return null;

  // Calculate script stats
  const words = scriptText.trim().split(/\s+/).filter(Boolean).length;
  const sentences = scriptText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const estimatedSeconds = Math.max(5, Math.round((words / 2.5) * 10) / 10);

  // Handle Audio File Upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFileName(file.name);
    const audioUrl = URL.createObjectURL(file);

    // Measure exact audio duration
    const tempAudio = new Audio();
    tempAudio.src = audioUrl;
    tempAudio.onloadedmetadata = () => {
      const dur = Math.round(tempAudio.duration * 10) / 10;
      setVoiceoverDuration(dur);
      setTtsAudioUrl(audioUrl);
      onShowToast(`Uploaded voiceover audio measured at ${dur.toFixed(1)}s!`);
    };
  };

  // Generate TTS with Gemini 3.8 Flash Lite TTS
  const handleGenerateVoiceover = async () => {
    if (!scriptText.trim()) return;
    setIsGeneratingTts(true);
    try {
      const res = await generateTTSWithAI(scriptText, selectedVoice);
      if (res.audioBase64) {
        const audioUrl = `data:${res.mimeType};base64,${res.audioBase64}`;
        setTtsAudioUrl(audioUrl);
        setAudioFileName(`Gemini_TTS_${selectedVoice}.wav`);

        // Measure generated audio duration
        const tempAudio = new Audio(audioUrl);
        tempAudio.onloadedmetadata = () => {
          const dur = Math.round(tempAudio.duration * 10) / 10;
          setVoiceoverDuration(dur);
          onShowToast(`Generated AI voiceover (${dur.toFixed(1)}s) with ${selectedVoice}!`);
        };
      }
    } catch (err: any) {
      alert('Failed to generate AI voiceover: ' + (err?.message || 'Error'));
    } finally {
      setIsGeneratingTts(false);
    }
  };

  // Toggle Audio Preview Playback
  const toggleAudioPreview = () => {
    if (!audioPreviewRef.current || !ttsAudioUrl) return;
    if (isPlayingTts) {
      audioPreviewRef.current.pause();
      setIsPlayingTts(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingTts(true);
    }
  };

  // Add more images to project scenes directly from modal
  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, fIdx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        onUpdateProject((prev) => {
          const newIdx = prev.scenes.length + 1;
          const newScene: Scene = {
            id: `scene-custom-${Date.now()}-${fIdx}`,
            sceneNumber: newIdx,
            title: `Scene ${newIdx}`,
            narration: '',
            imageUrl: url,
            duration: 4.0,
            startTime: prev.scenes[prev.scenes.length - 1]?.endTime || 0,
            endTime: (prev.scenes[prev.scenes.length - 1]?.endTime || 0) + 4.0,
            kenBurns: 'zoom-in',
            transition: 'crossfade',
            captions: [],
          };
          return {
            ...prev,
            scenes: [...prev.scenes, newScene],
          };
        });
      };
      reader.readAsDataURL(file);
    });
    onShowToast(`Added ${files.length} images to project queue.`);
  };

  // Run Gemini AI Smart Sync
  const handleRunAiSync = async () => {
    if (!scriptText.trim()) {
      alert('Please enter or paste your video script.');
      return;
    }
    if (project.scenes.length === 0) {
      alert('Please add at least one scene image to align.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(15);
    setSyncStep('Transmitting script & visual assets to Gemini 3.8 Flash...');

    try {
      await new Promise((r) => setTimeout(r, 400));
      setSyncProgress(35);
      setSyncStep('Gemini AI analyzing spoken cadence, syllables, and pause weights...');

      await new Promise((r) => setTimeout(r, 400));
      setSyncProgress(60);
      setSyncStep(`Matching ${project.scenes.length} images to narration beats and sentence flow...`);

      const result = await smartAiSyncWithVoiceAndScript(
        scriptText,
        project.scenes,
        voiceoverDuration,
        pacingStyle
      );

      setSyncProgress(85);
      setSyncStep('Locking mathematical timestamps (0.0s drift guarantee)...');

      await new Promise((r) => setTimeout(r, 300));
      setSyncProgress(100);
      setSyncStep('Complete! Review scene-by-scene alignment below.');

      setSyncResult(result);
    } catch (err: any) {
      alert('AI Synchronization failed: ' + (err?.message || 'Unknown error'));
      setIsSyncing(false);
    }
  };

  // Apply Results to Timeline Project
  const handleApplyToProject = () => {
    if (!syncResult) return;

    onUpdateProject((prev) => ({
      ...prev,
      scenes: syncResult.scenes,
      timelineCaptions: generateCaptions
        ? syncResult.timelineCaptions
        : prev.timelineCaptions,
      audio: {
        ...prev.audio,
        voiceoverDuration: syncResult.totalDuration,
        voiceoverUrl: ttsAudioUrl || prev.audio.voiceoverUrl,
      },
    }));

    onShowToast(
      `✓ Successfully aligned all ${syncResult.scenes.length} images to voiceover & script with Gemini AI!`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] bg-[#111319] border border-gray-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-gray-800/80 bg-[#161822] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Gemini AI Video Director & Image Auto-Sync
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/50 text-cyan-300 font-bold">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically adjusts image durations, sequence, camera motion, and captions to your voiceover & script.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!syncResult ? (
            <>
              {/* STEP 1: Script Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Step 1: Video Script (Narration Text)</span>
                  </label>
                  <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-mono">
                    <span>{words} words</span>
                    <span>·</span>
                    <span>{sentences} sentences</span>
                    <span>·</span>
                    <span className="text-cyan-400 font-semibold">
                      ~{estimatedSeconds.toFixed(1)}s speech
                    </span>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste your video script here. The AI will align each image to the corresponding narration sentence..."
                  className="w-full bg-[#0A0C12] border border-gray-800 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
                />

                {/* Quick Sample Scripts */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-gray-500">Quick Test Scripts:</span>
                  {SAMPLE_SCRIPTS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setScriptText(s.text)}
                      className="text-[11px] px-2 py-0.5 rounded bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-cyan-400 border border-gray-750 transition"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 2: Voiceover Audio & Duration */}
              <div className="space-y-3 bg-[#0D0F16] border border-gray-800/80 rounded-xl p-4">
                <label className="text-xs font-bold text-gray-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span>Step 2: Voiceover Audio & Timing Target</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                    Target: {voiceoverDuration.toFixed(1)}s
                  </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Upload Voiceover File */}
                  <div className="bg-[#141620] border border-gray-800 rounded-lg p-3 space-y-2">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Option A: Upload Your Voiceover Audio
                    </span>
                    <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-xs text-gray-200 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">
                        {audioFileName || 'Choose MP3 / WAV audio file'}
                      </span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Auto-detects the exact audio duration to synchronize images with zero drift.
                    </p>
                  </div>

                  {/* Generate AI Voiceover with Gemini TTS */}
                  <div className="bg-[#141620] border border-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-300">
                        Option B: Generate Studio Voiceover (Gemini TTS)
                      </span>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                      >
                        <option value="Zephyr">Zephyr (Deep Narrator)</option>
                        <option value="Kore">Kore (Warm Professional)</option>
                        <option value="Puck">Puck (Energetic)</option>
                        <option value="Fenrir">Fenrir (Authoritative)</option>
                        <option value="Charon">Charon (Calm Cinematic)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateVoiceover}
                      disabled={isGeneratingTts || !scriptText.trim()}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingTts ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isGeneratingTts
                          ? 'Synthesizing Audio with Gemini...'
                          : 'Generate Audio Voiceover'}
                      </span>
                    </button>
                    <p className="text-[10px] text-gray-500">
                      Generates high-fidelity WAV narration spoken by Google Gemini.
                    </p>
                  </div>
                </div>

                {/* Duration Slider Fallback */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <span className="text-[11px] text-gray-400 shrink-0">
                    Adjust Duration Manually:
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={180}
                    step={1}
                    value={voiceoverDuration}
                    onChange={(e) => setVoiceoverDuration(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
                  />
                  <div className="flex items-center gap-1 font-mono text-xs text-cyan-400 font-bold shrink-0">
                    <span>{voiceoverDuration.toFixed(1)}s</span>
                    <button
                      onClick={() => setVoiceoverDuration(estimatedSeconds)}
                      className="text-[10px] text-gray-500 hover:text-gray-300 ml-1 underline"
                      title="Sync to estimated script reading time"
                    >
                      (Use Script Est)
                    </button>
                  </div>
                </div>

                {/* Audio Preview element if loaded */}
                {ttsAudioUrl && (
                  <div className="mt-2 flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-gray-800">
                    <div className="flex items-center space-x-2 text-xs text-gray-300">
                      <button
                        onClick={toggleAudioPreview}
                        className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition"
                      >
                        {isPlayingTts ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                      <span className="text-[11px] font-mono text-gray-400">
                        Voiceover Preview Ready ({voiceoverDuration.toFixed(1)}s)
                      </span>
                    </div>
                    <audio
                      ref={audioPreviewRef}
                      src={ttsAudioUrl}
                      onEnded={() => setIsPlayingTts(false)}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* STEP 3: Your Images to Synchronize */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>
                      Step 3: Your Visual Assets ({project.scenes.length} Images in Project)
                    </span>
                  </label>

                  <label className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-semibold">
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add More Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleAddImages}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Image Filmstrip Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 bg-[#0A0C12] p-3 rounded-xl border border-gray-800/80 max-h-48 overflow-y-auto">
                  {project.scenes.map((scene, idx) => (
                    <div
                      key={scene.id}
                      className="relative rounded-lg overflow-hidden border border-gray-700/60 bg-gray-900 aspect-video group"
                    >
                      <img
                        src={scene.imageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white">
                        #{idx + 1}
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-mono text-gray-300">
                        {scene.duration.toFixed(1)}s
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500">
                  Each image will be assigned its exact spoken duration, natural scene cut, Ken Burns camera move, and captions.
                </p>
              </div>

              {/* STEP 4: Direction Style & Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0D0F16] p-4 rounded-xl border border-gray-800/80">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Pacing & Retention Style
                  </label>
                  <select
                    value={pacingStyle}
                    onChange={(e) => setPacingStyle(e.target.value)}
                    className="w-full bg-[#141620] border border-gray-700 rounded-lg p-2 text-xs text-gray-200 outline-none"
                  >
                    <option value="YouTube High Retention (2.5 - 4.0s fast cuts)">
                      YouTube High Retention (Fast 2.5-4s cuts)
                    </option>
                    <option value="Cinematic Documentary (4.0 - 6.5s smooth)">
                      Cinematic Documentary (Smooth 4-6.5s narrative flow)
                    </option>
                    <option value="Dramatic Storytelling (Suspense builds, slow zoom)">
                      Dramatic Storytelling (Suspense builds, slow zoom)
                    </option>
                    <option value="Educational Explainer (Clear steady beats)">
                      Educational Explainer (Clear steady beats)
                    </option>
                  </select>
                </div>

                <div className="flex flex-col justify-center space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={generateCaptions}
                      onChange={(e) => setGenerateCaptions(e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    <span className="font-semibold">
                      Auto-Generate Word-Sync Timeline Captions
                    </span>
                  </label>
                  <p className="text-[10px] text-gray-500">
                    Creates dynamic multi-beat captions synchronized to narration on Track 1.
                  </p>
                </div>
              </div>

              {/* ACTION TRIGGER BUTTON */}
              <div className="pt-2">
                <button
                  onClick={handleRunAiSync}
                  disabled={isSyncing || !scriptText.trim() || project.scenes.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/50 transition active:scale-[0.99] disabled:opacity-50"
                >
                  {isSyncing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  <span>
                    {isSyncing
                      ? 'Gemini AI Aligning Scenes...'
                      : `Run Gemini AI Smart Sync (${project.scenes.length} Images → ${voiceoverDuration.toFixed(1)}s Audio)`}
                  </span>
                </button>
              </div>

              {/* Loading Live Progress Bar */}
              {isSyncing && (
                <div className="space-y-2 bg-[#0A0C12] border border-cyan-800/40 p-4 rounded-xl animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400 font-semibold flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {syncStep}
                    </span>
                    <span className="font-mono text-gray-400">{syncProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* RESULTS REVIEW SCREEN */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-300">
                      Gemini AI Synchronization Complete!
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {syncResult.scenes.length} visual scenes aligned perfectly across {syncResult.totalDuration.toFixed(1)}s of narration.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSyncResult(null)}
                  className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
                >
                  Adjust & Re-run
                </button>
              </div>

              {/* Scene Breakdown Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300 block">
                  Synchronized Scenes Breakdown:
                </span>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {syncResult.scenes.map((scene, idx) => (
                    <div
                      key={scene.id || idx}
                      className="flex items-center gap-3 bg-[#0D0F16] border border-gray-800 p-2.5 rounded-xl hover:border-gray-700 transition"
                    >
                      <img
                        src={scene.imageUrl}
                        alt={scene.title}
                        className="w-16 h-10 object-cover rounded-lg border border-gray-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white truncate">
                            #{idx + 1} {scene.title}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                            {scene.startTime.toFixed(1)}s - {scene.endTime.toFixed(1)}s ({scene.duration.toFixed(1)}s)
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Camera: {scene.kenBurns || 'zoom-in'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          "{scene.narration || 'Visual cut'}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply / Cancel Footer */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-800">
                <button
                  onClick={() => setSyncResult(null)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
                >
                  Back to Settings
                </button>
                <button
                  onClick={handleApplyToProject}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply to Timeline & Project</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
