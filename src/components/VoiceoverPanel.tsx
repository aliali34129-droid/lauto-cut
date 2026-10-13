import React, { useState, useRef } from 'react';
import { VideoProject, Scene } from '../types/editor';
import { AudioEngine } from '../services/audioEngine';
import { generateTTSWithAI } from '../services/geminiService';
import {
  Mic,
  Upload,
  Sparkles,
  Volume2,
  Play,
  Pause,
  Loader2,
  Check,
  AlertCircle,
  X,
  Radio,
  FileAudio,
} from 'lucide-react';

interface VoiceoverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  audioEngine: AudioEngine;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onAutoSyncScenesToDuration: (duration: number) => void;
}

export const VoiceoverPanel: React.FC<VoiceoverPanelProps> = ({
  isOpen,
  onClose,
  project,
  audioEngine,
  onUpdateProject,
  onAutoSyncScenesToDuration,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'ai_tts' | 'record'>('upload');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [speechStyle, setSpeechStyle] = useState(
    'Engaging, clear, authoritative YouTube documentary narrator'
  );
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  // Handle Audio File Upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Offer auto-sync scenes
      onAutoSyncScenesToDuration(duration);
    };
  };

  // Generate Voiceover with Gemini TTS
  const handleGenerateAI_TTS = async () => {
    const fullScript = project.scenes
      .map((s) => s.narration.trim())
      .filter(Boolean)
      .join(' ');

    if (!fullScript) {
      setTtsError('Your scenes do not contain narration text. Add narration to scenes first.');
      return;
    }

    setIsGeneratingTTS(true);
    setTtsError(null);

    try {
      const result = await generateTTSWithAI(fullScript, selectedVoice, speechStyle);
      const audioUrl = `data:audio/wav;base64,${result.audioBase64}`;

      const tempAudio = new Audio();
      tempAudio.src = audioUrl;
      tempAudio.onloadedmetadata = () => {
        const duration = tempAudio.duration || project.scenes.reduce((acc, s) => acc + s.duration, 0);
        audioEngine.setVoiceoverSource(audioUrl);

        onUpdateProject((prev) => ({
          ...prev,
          audio: {
            ...prev.audio,
            voiceoverUrl: audioUrl,
            voiceoverFileName: `AI_Voiceover_${result.voiceName}.wav`,
            voiceoverDuration: duration,
          },
        }));

        onAutoSyncScenesToDuration(duration);
      };
    } catch (err: any) {
      console.error(err);
      setTtsError(err?.message || 'Failed to generate voiceover with Gemini AI.');
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const tempAudio = new Audio();
        tempAudio.src = url;
        tempAudio.onloadedmetadata = () => {
          const dur = tempAudio.duration || recordingSeconds;
          audioEngine.setVoiceoverSource(url);

          onUpdateProject((prev) => ({
            ...prev,
            audio: {
              ...prev.audio,
              voiceoverUrl: url,
              voiceoverFileName: 'Mic_Voiceover.webm',
              voiceoverDuration: dur,
            },
          }));

          onAutoSyncScenesToDuration(dur);
        };
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      alert('Could not access microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Voiceover Audio & Scene Sync
              </h3>
              <p className="text-[11px] text-gray-400">
                Upload custom voiceover, record mic, or generate ultra-realistic AI voiceover
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

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-800 bg-gray-950 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Audio File</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_tts')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'ai_tts'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Narration (Gemini TTS)</span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'record'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Record Mic</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {ttsError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{ttsError}</span>
            </div>
          )}

          {/* Current Voiceover Status */}
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <FileAudio className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-semibold text-white">
                  {project.audio.voiceoverFileName || 'No audio file linked'}
                </p>
                <p className="text-[11px] text-gray-400">
                  Duration: {project.audio.voiceoverDuration.toFixed(1)}s (
                  {project.scenes.length} scenes aligned)
                </p>
              </div>
            </div>

            <button
              onClick={() => onAutoSyncScenesToDuration(project.audio.voiceoverDuration)}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Sync Scenes</span>
            </button>
          </div>

          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-700 hover:border-purple-500/80 rounded-2xl p-6 text-center bg-gray-950/60 transition group cursor-pointer relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-200">
                    Click or drop your voiceover audio file here
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Supports MP3, WAV, M4A, AAC, WebM
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-xs text-purple-300">
                <p className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Automatic Scene-by-Scene Synchronization:
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Once uploaded, your video images will automatically distribute across the exact voiceover timeline, ensuring no scene cuts off early or drags too long!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: AI VOICE GENERATOR */}
          {activeTab === 'ai_tts' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Select Narrator Voice
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Zephyr', label: 'Zephyr', desc: 'Authoritative & Dynamic' },
                    { id: 'Puck', label: 'Puck', desc: 'Energetic & Punchy' },
                    { id: 'Charon', label: 'Charon', desc: 'Deep & Serious' },
                    { id: 'Kore', label: 'Kore', desc: 'Warm & Professional' },
                    { id: 'Fenrir', label: 'Fenrir', desc: 'Cinematic Voice' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        selectedVoice === v.id
                          ? 'bg-purple-600/30 border-purple-500 text-white'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <p className="font-bold text-xs text-white">{v.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Narration Tone & Style
                </label>
                <input
                  type="text"
                  value={speechStyle}
                  onChange={(e) => setSpeechStyle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleGenerateAI_TTS}
                disabled={isGeneratingTTS}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
              >
                {isGeneratingTTS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating 24kHz Studio Audio with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Voiceover & Auto-Sync Scenes</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: RECORD MIC */}
          {activeTab === 'record' && (
            <div className="space-y-4 text-center py-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition ${
                    isRecording
                      ? 'bg-red-600 animate-pulse text-white shadow-xl shadow-red-600/40'
                      : 'bg-gray-900 border border-gray-800 text-gray-400'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </div>

                <p className="text-sm font-bold text-white mt-3">
                  {isRecording ? `Recording: ${recordingSeconds}s` : 'Ready to Record'}
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Read your script line-by-line. When finished, scenes will align with your speech timing.
                </p>
              </div>

              <div className="flex justify-center gap-3">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition"
                  >
                    Stop & Apply Audio
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Voiceover Volume Slider */}
          <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
            <div className="flex justify-between items-center mb-1.5 text-xs text-gray-300">
              <span className="flex items-center gap-1 font-semibold">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                Voiceover Master Volume
              </span>
              <span className="font-mono text-gray-400">
                {Math.round(project.audio.voiceoverVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={project.audio.voiceoverVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                audioEngine.setVoiceoverVolume(vol);
                onUpdateProject((prev) => ({
                  ...prev,
                  audio: { ...prev.audio, voiceoverVolume: vol },
                }));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0B0F17] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
