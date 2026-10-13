import React, { useState } from 'react';
import { CapCutTab } from './CapCutSidebar';
import {
  VideoProject,
  Scene,
  VisualEffect,
  TransitionType,
  KenBurnsEffect,
  AppTheme,
  TimelineCaption,
} from '../../types/editor';
import { AudioEngine, TRENDING_MUSIC_TRACKS } from '../../services/audioEngine';
import { STOCK_IMAGES, STOCK_CATEGORIES } from '../../data/stockLibrary';
import { CAPTION_PRESETS } from '../../data/captionPresets';
import { APP_THEMES } from '../../data/themes';
import {
  parseScriptWithAI,
  generateTTSWithAI,
  buildScenesFromAI,
  smartAiSyncWithVoiceAndScript,
} from '../../services/geminiService';
import {
  Upload,
  Search,
  Plus,
  Play,
  Pause,
  Sparkles,
  Sliders,
  Volume2,
  Zap,
  Mic,
  Loader2,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Palette,
  Film,
  Camera,
  Layers,
  Wand2,
  Type,
  Edit2,
  Maximize2,
} from 'lucide-react';

interface CapCutDrawerProps {
  activeTab: CapCutTab;
  project: VideoProject;
  audioEngine: AudioEngine;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onSelectScene: (scene: Scene) => void;
  selectedSceneId: string | null;
  onAutoSyncScenes: (dur?: number) => void;
  currentTime?: number;
  onTimeSeek?: (t: number) => void;
  selectedCaptionId?: string | null;
  onSelectCaption?: (cId: string | null) => void;
  onOpenAiDirector?: () => void;
}

export const CapCutDrawer: React.FC<CapCutDrawerProps> = ({
  activeTab,
  project,
  audioEngine,
  onUpdateProject,
  onSelectScene,
  selectedSceneId,
  onAutoSyncScenes,
  currentTime = 0,
  onTimeSeek,
  selectedCaptionId,
  onSelectCaption,
  onOpenAiDirector,
}) => {
  // Media State
  const [stockCategory, setStockCategory] = useState('All');
  const [searchStock, setSearchStock] = useState('');

  // Audio State
  const [audioSubTab, setAudioSubTab] = useState<'voiceover' | 'music' | 'sfx'>('voiceover');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);

  // Text / Caption State
  const [captionCategory, setCaptionCategory] = useState('All');
  const [captionSubTab, setCaptionSubTab] = useState<'auto' | 'presets' | 'customize' | 'segments'>('auto');
  const [autoPacing, setAutoPacing] = useState<'single' | 'punchy' | 'sentence'>('punchy');

  // Script State
  const [scriptInput, setScriptInput] = useState(
    () =>
      project.scenes.map((s) => s.narration).join('\n\n') ||
      `Did you know that top YouTube creators follow a strict blueprint for high viewer retention?
Every few seconds, the visual changes with a subtle cinematic pan to keep the audience engaged.
When you combine high-stakes storytelling with automated visual pacing, watch time skyrockets.
In this video, we break down the exact three-step formula.`
  );
  const [isAiBreakingDown, setIsAiBreakingDown] = useState(false);

  // Batch Image Upload
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

  // Upload Custom Voiceover
  const handleVoiceoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Apply Transition to All or Selected Clip
  const handleApplyTransition = (trans: TransitionType) => {
    audioEngine.playSFX('whoosh');
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => ({ ...s, transition: trans })),
    }));
  };

  // Apply Visual Filter to All Clips
  const handleApplyFilter = (filter: VisualEffect) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => ({ ...s, visualEffect: filter })),
    }));
  };

  // Apply Ken Burns Effect to All Clips
  const handleApplyKenBurns = (effect: KenBurnsEffect) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => ({ ...s, kenBurns: effect })),
    }));
  };

  // Auto Generate Captions from Voiceover (CapCut Speech Detection)
  const handleAutoGenerateCaptions = (pacing: 'single' | 'punchy' | 'sentence' = autoPacing) => {
    onUpdateProject((prev) => {
      const generatedTimelineCaptions: typeof prev.timelineCaptions = [];
      let globalCounter = 1;

      const chunkSize = pacing === 'single' ? 1 : pacing === 'punchy' ? 3 : 6;

      prev.scenes.forEach((scene) => {
        const words = (scene.narration || '').trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return;

        const totalChunks = Math.ceil(words.length / chunkSize);
        const chunkDuration = scene.duration / Math.max(1, totalChunks);

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunkWords = words.slice(i, i + chunkSize).join(' ');
          const chunkIdx = Math.floor(i / chunkSize);
          const start = Math.round((scene.startTime + chunkIdx * chunkDuration) * 10) / 10;
          const end = Math.round((start + chunkDuration) * 10) / 10;

          generatedTimelineCaptions.push({
            id: `tc-${Date.now()}-${globalCounter++}`,
            text: chunkWords,
            startTime: start,
            endTime: end,
            duration: Math.round((end - start) * 10) / 10,
          });
        }
      });

      return {
        ...prev,
        timelineCaptions: generatedTimelineCaptions,
        captionStyle: { ...prev.captionStyle, enabled: true },
      };
    });
  };

  // Clear all captions
  const handleClearAllCaptions = () => {
    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: [],
    }));
    if (onSelectCaption) onSelectCaption(null);
  };

  // Auto-Adjust User's Existing Images to Script & Voiceover
  const [isAdjustingImages, setIsAdjustingImages] = useState(false);
  const handleAdjustExistingImagesToScript = async () => {
    if (!scriptInput.trim() || project.scenes.length === 0) return;
    setIsAdjustingImages(true);
    try {
      const dur =
        project.audio.voiceoverDuration ||
        project.scenes.reduce((acc, s) => acc + s.duration, 0) ||
        30;
      const result = await smartAiSyncWithVoiceAndScript(
        scriptInput,
        project.scenes,
        dur
      );
      onUpdateProject((prev) => ({
        ...prev,
        scenes: result.scenes,
        timelineCaptions: result.timelineCaptions,
      }));
      alert(`✓ All ${result.scenes.length} images adjusted perfectly to script and voiceover!`);
    } catch (err: any) {
      alert('AI Image adjustment failed: ' + err.message);
    } finally {
      setIsAdjustingImages(false);
    }
  };

  // Break Script with Gemini AI
  const handleScriptBreakdown = async () => {
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

  const filteredStock = STOCK_IMAGES.filter((item) => {
    const matchCat = stockCategory === 'All' || item.category === stockCategory;
    const matchQ =
      searchStock.trim() === '' ||
      item.title.toLowerCase().includes(searchStock.toLowerCase()) ||
      item.keywords.some((k) => k.toLowerCase().includes(searchStock.toLowerCase()));
    return matchCat && matchQ;
  });

  const filteredCaptionPresets = CAPTION_PRESETS.filter(
    (p) => captionCategory === 'All' || p.category === captionCategory
  );

  return (
    <div className="w-80 sm:w-92 bg-[#14161F] border-r border-gray-800/80 flex flex-col h-full overflow-hidden select-none shrink-0 z-10">
      {/* Drawer Top Title Bar */}
      <div className="h-11 px-4 border-b border-gray-800/80 flex items-center justify-between bg-[#111319] shrink-0">
        <span className="font-bold text-xs uppercase tracking-wider text-gray-200">
          {activeTab === 'media' && 'Media & Visual Assets'}
          {activeTab === 'audio' && 'Audio & Sound Effects'}
          {activeTab === 'text' && 'Text & Captions Studio'}
          {activeTab === 'effects' && 'Visual & Motion Effects'}
          {activeTab === 'transitions' && 'Video Transitions'}
          {activeTab === 'filters' && 'Cinematic Color Grading'}
          {activeTab === 'themes' && 'App Studio Themes'}
          {activeTab === 'script' && 'AI Script to Video'}
        </span>
      </div>

      {/* Drawer Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ===================== TAB 1: MEDIA ===================== */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            {/* Batch Upload Area */}
            <div className="border border-dashed border-gray-700 hover:border-cyan-500 rounded-xl p-4 text-center bg-[#0D0F16] transition relative cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleBatchImageUpload(e.target.files)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <Upload className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition" />
                <p className="text-xs font-bold text-white">Import Photos (Batch)</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Drag multiple files to fill all scenes</p>
              </div>
            </div>

            {/* Curated Stock Library */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-300">YouTube Stock Visuals</span>
                <span className="text-[10px] text-gray-500">{filteredStock.length} items</span>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search wealth, tech, mystery..."
                  value={searchStock}
                  onChange={(e) => setSearchStock(e.target.value)}
                  className="w-full bg-[#0D0F16] border border-gray-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1">
                {STOCK_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setStockCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                      stockCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-[#0D0F16] text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid Images */}
              <div className="grid grid-cols-2 gap-2 pt-1 max-h-[380px] overflow-y-auto pr-0.5">
                {filteredStock.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (selectedSceneId) {
                        onUpdateProject((prev) => ({
                          ...prev,
                          scenes: prev.scenes.map((s) =>
                            s.id === selectedSceneId ? { ...s, imageUrl: item.url } : s
                          ),
                        }));
                      } else {
                        // Add as new scene
                        const last = project.scenes[project.scenes.length - 1];
                        const start = last ? last.endTime : 0;
                        const dur = 4.0;
                        const newSc: Scene = {
                          id: `scene-${Date.now()}`,
                          sceneNumber: project.scenes.length + 1,
                          title: item.title,
                          narration: 'Narration for this visual scene...',
                          startTime: start,
                          endTime: start + dur,
                          duration: dur,
                          imageUrl: item.url,
                          kenBurns: 'zoom-in',
                          transition: 'crossfade',
                          visualEffect: 'cinematic',
                          captions: [{ id: `c-${Date.now()}`, text: 'KEY TAKEAWAY', relativeStart: 0, duration: dur }],
                        };
                        onUpdateProject((prev) => ({ ...prev, scenes: [...prev.scenes, newSc] }));
                        onSelectScene(newSc);
                      }
                    }}
                    className="group relative aspect-video rounded-lg overflow-hidden bg-gray-900 border border-gray-800 hover:border-cyan-400 cursor-pointer shadow-sm transition"
                  >
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-0.5 rounded">
                        {selectedSceneId ? 'Apply to Clip' : '+ Add Scene'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: AUDIO ===================== */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            {/* Audio Type Pills */}
            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs font-semibold">
              <button
                onClick={() => setAudioSubTab('voiceover')}
                className={`flex-1 py-1 rounded transition ${audioSubTab === 'voiceover' ? 'bg-[#1C1F2B] text-white' : 'text-gray-400'}`}
              >
                Voiceover
              </button>
              <button
                onClick={() => setAudioSubTab('music')}
                className={`flex-1 py-1 rounded transition ${audioSubTab === 'music' ? 'bg-[#1C1F2B] text-white' : 'text-gray-400'}`}
              >
                Music
              </button>
              <button
                onClick={() => setAudioSubTab('sfx')}
                className={`flex-1 py-1 rounded transition ${audioSubTab === 'sfx' ? 'bg-[#1C1F2B] text-white' : 'text-gray-400'}`}
              >
                SFX
              </button>
            </div>

            {/* Voiceover Section */}
            {audioSubTab === 'voiceover' && (
              <div className="space-y-3">
                {/* Upload Voice File */}
                <label className="border border-dashed border-gray-700 hover:border-purple-500 rounded-xl p-3 text-center bg-[#0D0F16] transition block cursor-pointer">
                  <input type="file" accept="audio/*" onChange={handleVoiceoverUpload} className="hidden" />
                  <Mic className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-white block">Upload Voiceover Audio</span>
                  <span className="text-[10px] text-gray-400">MP3, WAV, M4A — Auto-fits all scene timing</span>
                </label>

                {/* AI TTS Section */}
                <div className="p-3 bg-[#0D0F16] rounded-xl border border-gray-800 space-y-2.5">
                  <span className="text-xs font-bold text-white block">Studio AI Voiceover</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Zephyr', 'Puck', 'Charon', 'Kore'].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVoice(v)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                          selectedVoice === v ? 'bg-purple-600/30 border-purple-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-400'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerateAiVoice}
                    disabled={isGeneratingTts}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    {isGeneratingTts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Generate & Sync Voice</span>
                  </button>
                </div>
              </div>
            )}

            {/* Music Section */}
            {audioSubTab === 'music' && (
              <div className="space-y-3">
                {/* Auto Ducking Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0F16] border border-gray-800 text-xs">
                  <div>
                    <span className="font-bold text-white flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Auto-Ducking
                    </span>
                    <p className="text-[10px] text-gray-400">-75% volume during speech</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={project.audio.autoDucking}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      audioEngine.setAutoDucking(enabled, project.audio.duckingAmount);
                      onUpdateProject((prev) => ({ ...prev, audio: { ...prev.audio, autoDucking: enabled } }));
                    }}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* BGM List */}
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
                  {TRENDING_MUSIC_TRACKS.map((track) => {
                    const isSelected = project.audio.musicTrackId === track.id;
                    const isPlaying = previewTrackId === track.id;

                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          audioEngine.setMusicTrackPreset(track.synthPreset);
                          onUpdateProject((prev) => ({ ...prev, audio: { ...prev.audio, musicTrackId: track.id } }));
                        }}
                        className={`p-2 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                          isSelected ? 'bg-amber-950/25 border-amber-500' : 'bg-[#0D0F16] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-white block">{track.title}</span>
                          <span className="text-[10px] text-gray-500">{track.genre}</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (previewTrackId === track.id) {
                              audioEngine.pause();
                              setPreviewTrackId(null);
                            } else {
                              audioEngine.setMusicTrackPreset(track.synthPreset);
                              audioEngine.play(0);
                              setPreviewTrackId(track.id);
                            }
                          }}
                          className="p-1 rounded bg-gray-800 text-gray-300 hover:text-white"
                        >
                          {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CapCut SFX Library */}
            {audioSubTab === 'sfx' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300 block">CapCut Sound Effects</span>
                <p className="text-[11px] text-gray-400 mb-2">Audition procedural transition impacts and whooshes:</p>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'whoosh', name: 'Cinematic Whoosh', desc: 'Fast air whip for cut transitions' },
                    { id: 'impact', name: 'Sub-Bass Impact Boom', desc: 'Heavy dramatic 808 drop punch' },
                    { id: 'shutter', name: 'Camera Shutter Click', desc: 'Mechanical flash snapshot' },
                    { id: 'pop', name: 'Bubble Pop', desc: 'Lighthearted notification bounce' },
                    { id: 'ding', name: 'Chime Bell Ding', desc: 'Clean high-pitch metallic note' },
                  ].map((sfx) => (
                    <div
                      key={sfx.id}
                      onClick={() => audioEngine.playSFX(sfx.id as any)}
                      className="p-2.5 rounded-lg bg-[#0D0F16] border border-gray-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between transition group"
                    >
                      <div>
                        <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition">{sfx.name}</span>
                        <span className="text-[10px] text-gray-500 block">{sfx.desc}</span>
                      </div>
                      <span className="p-1.5 rounded-md bg-gray-800 text-gray-300 group-hover:bg-cyan-500 group-hover:text-black transition">
                        <Play className="w-3 h-3 fill-current" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: TEXT & CAPTIONS ===================== */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            {/* Master Action Header */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#0D0F16] border border-gray-800 text-xs">
              <button
                onClick={() => handleAutoGenerateCaptions()}
                className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold flex items-center gap-1 transition"
                title="Auto-generate sync captions from narration"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Captions</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      captionStyle: { ...prev.captionStyle, enabled: !prev.captionStyle.enabled },
                    }))
                  }
                  className={`p-1 px-2 rounded font-bold text-[11px] flex items-center gap-1 ${
                    project.captionStyle.enabled ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-800 text-gray-400'
                  }`}
                  title={project.captionStyle.enabled ? "Disable all captions" : "Enable captions"}
                >
                  {project.captionStyle.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{project.captionStyle.enabled ? 'Captions On' : 'No Captions'}</span>
                </button>

                {project.timelineCaptions.length > 0 && (
                  <button
                    onClick={handleClearAllCaptions}
                    className="p-1 text-gray-500 hover:text-red-400 rounded"
                    title="Remove all captions"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs: Auto-Captions vs 22+ Presets vs Color Studio vs Segments */}
            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 text-[11px] font-semibold">
              <button
                onClick={() => setCaptionSubTab('auto')}
                className={`flex-1 py-1 rounded transition ${captionSubTab === 'auto' ? 'bg-[#1C1F2B] text-cyan-400 font-bold' : 'text-gray-400'}`}
              >
                Auto-Captions
              </button>
              <button
                onClick={() => setCaptionSubTab('presets')}
                className={`flex-1 py-1 rounded transition ${captionSubTab === 'presets' ? 'bg-[#1C1F2B] text-white' : 'text-gray-400'}`}
              >
                Presets
              </button>
              <button
                onClick={() => setCaptionSubTab('customize')}
                className={`flex-1 py-1 rounded transition ${captionSubTab === 'customize' ? 'bg-[#1C1F2B] text-white' : 'text-gray-400'}`}
              >
                Color Studio
              </button>
              <button
                onClick={() => setCaptionSubTab('segments')}
                className={`flex-1 py-1 rounded transition ${captionSubTab === 'segments' ? 'bg-[#1C1F2B] text-white' : 'text-gray-400'}`}
              >
                Captions ({project.timelineCaptions.length})
              </button>
            </div>

            {/* CapCut Signature Auto-Captions & Speech Detection */}
            {captionSubTab === 'auto' && (
              <div className="space-y-3.5">
                <div className="p-3 bg-[#0D0F16] rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Auto Speech Detection</span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      English (Auto)
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Automatically transcribe and synchronize on-screen subtitles to voiceover pacing with YouTube retention styling.
                  </p>

                  {/* Pacing Template Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Retention Pacing Template
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setAutoPacing('single')}
                        className={`p-2 rounded-lg border text-left transition ${
                          autoPacing === 'single'
                            ? 'bg-cyan-950/30 border-cyan-400 text-white'
                            : 'bg-black/60 border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[11px] font-bold block">1-Word Flash</span>
                        <span className="text-[9px] text-gray-500 block">MrBeast Fast</span>
                      </button>

                      <button
                        onClick={() => setAutoPacing('punchy')}
                        className={`p-2 rounded-lg border text-left transition ${
                          autoPacing === 'punchy'
                            ? 'bg-cyan-950/30 border-cyan-400 text-white'
                            : 'bg-black/60 border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[11px] font-bold block">Punchy 3-Words</span>
                        <span className="text-[9px] text-yellow-400 font-bold block">Viral TikTok</span>
                      </button>

                      <button
                        onClick={() => setAutoPacing('sentence')}
                        className={`p-2 rounded-lg border text-left transition ${
                          autoPacing === 'sentence'
                            ? 'bg-cyan-950/30 border-cyan-400 text-white'
                            : 'bg-black/60 border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[11px] font-bold block">Full Sentence</span>
                        <span className="text-[9px] text-gray-500 block">Documentary</span>
                      </button>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={() => handleAutoGenerateCaptions(autoPacing)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition"
                  >
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>Detect & Auto-Generate Captions</span>
                  </button>
                </div>

                {/* Quick Presets Carousel */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-300 block">Trending Caption Presets</span>
                  <div className="grid grid-cols-2 gap-2">
                    {CAPTION_PRESETS.slice(0, 6).map((presetDef) => {
                      const isSelected = project.captionStyle.preset === presetDef.id && project.captionStyle.enabled;

                      return (
                        <div
                          key={presetDef.id}
                          onClick={() =>
                            onUpdateProject((prev) => ({
                              ...prev,
                              captionStyle: { ...prev.captionStyle, ...presetDef.style, enabled: true },
                            }))
                          }
                          className={`p-2 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-yellow-950/25 border-yellow-400 ring-1 ring-yellow-400/40'
                              : 'bg-[#0D0F16] border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-bold text-white block truncate">{presetDef.name}</span>
                            <span className="text-[9px] text-yellow-300 font-bold block truncate font-['Cabinet_Grotesk']">
                              {presetDef.previewSample}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Presets List */}
            {captionSubTab === 'presets' && (
              <div className="space-y-2">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-1">
                  {['All', 'Viral YouTube', 'Cinematic & Documentary', 'Aesthetic & Neon', 'Clean & Modern'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCaptionCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                        captionCategory === cat
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          : 'bg-[#0D0F16] text-gray-400 hover:text-white border border-gray-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-0.5">
                  {filteredCaptionPresets.map((presetDef) => {
                    const isSelected = project.captionStyle.preset === presetDef.id && project.captionStyle.enabled;

                    return (
                      <div
                        key={presetDef.id}
                        onClick={() =>
                          onUpdateProject((prev) => ({
                            ...prev,
                            captionStyle: { ...prev.captionStyle, ...presetDef.style, enabled: true },
                          }))
                        }
                        className={`p-2 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                          isSelected ? 'bg-yellow-950/25 border-yellow-500' : 'bg-[#0D0F16] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{presetDef.name}</span>
                            <span className="text-[9px] text-gray-500 font-mono">[{presetDef.category}]</span>
                          </div>
                          <span className="text-[10px] text-yellow-300 font-bold font-['Cabinet_Grotesk'] block mt-0.5">
                            {presetDef.previewSample}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Color Studio */}
            {captionSubTab === 'customize' && (
              <div className="space-y-3 text-xs bg-[#0D0F16] p-3 rounded-xl border border-gray-800">
                {/* Text Color */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Base Text Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={project.captionStyle.textColor}
                      onChange={(e) =>
                        onUpdateProject((prev) => ({
                          ...prev,
                          captionStyle: { ...prev.captionStyle, textColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-gray-950 border border-gray-700 px-1 py-0.5 rounded text-[10px] font-mono text-center"
                    />
                    <input
                      type="color"
                      value={project.captionStyle.textColor}
                      onChange={(e) =>
                        onUpdateProject((prev) => ({
                          ...prev,
                          captionStyle: { ...prev.captionStyle, textColor: e.target.value },
                        }))
                      }
                      className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Highlight Keyword Color */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Active Highlight Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={project.captionStyle.highlightColor}
                      onChange={(e) =>
                        onUpdateProject((prev) => ({
                          ...prev,
                          captionStyle: { ...prev.captionStyle, highlightColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-gray-950 border border-gray-700 px-1 py-0.5 rounded text-[10px] font-mono text-center"
                    />
                    <input
                      type="color"
                      value={project.captionStyle.highlightColor}
                      onChange={(e) =>
                        onUpdateProject((prev) => ({
                          ...prev,
                          captionStyle: { ...prev.captionStyle, highlightColor: e.target.value },
                        }))
                      }
                      className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Box Background Color & Opacity */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Box Background Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={project.captionStyle.backgroundColor === 'transparent' ? '#000000' : project.captionStyle.backgroundColor}
                      onChange={(e) =>
                        onUpdateProject((prev) => ({
                          ...prev,
                          captionStyle: { ...prev.captionStyle, backgroundColor: e.target.value, backgroundOpacity: Math.max(0.6, prev.captionStyle.backgroundOpacity) },
                        }))
                      }
                      className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Background Box Opacity */}
                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>Box Opacity: {Math.round(project.captionStyle.backgroundOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={project.captionStyle.backgroundOpacity}
                    onChange={(e) =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        captionStyle: { ...prev.captionStyle, backgroundOpacity: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                </div>

                {/* Stroke Outline Color & Width */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Outline / Stroke Color</span>
                  <input
                    type="color"
                    value={project.captionStyle.strokeColor || '#000000'}
                    onChange={(e) =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        captionStyle: { ...prev.captionStyle, strokeColor: e.target.value },
                      }))
                    }
                    className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                  />
                </div>

                {/* Stroke Width Slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>Stroke Width: {project.captionStyle.strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={project.captionStyle.strokeWidth}
                    onChange={(e) =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        captionStyle: { ...prev.captionStyle, strokeWidth: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                </div>

                {/* Font Size */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Font Size</span>
                  <div className="flex gap-1">
                    {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map((fs) => (
                      <button
                        key={fs}
                        onClick={() =>
                          onUpdateProject((prev) => ({
                            ...prev,
                            captionStyle: { ...prev.captionStyle, fontSize: fs },
                          }))
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          project.captionStyle.fontSize === fs
                            ? 'bg-yellow-400 text-black'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {fs.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Y */}
                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>Position Y: {project.captionStyle.yOffsetPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    value={project.captionStyle.yOffsetPercent || 82}
                    onChange={(e) =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        captionStyle: { ...prev.captionStyle, yOffsetPercent: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                </div>

                {/* Animation Type */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">Animation</span>
                  <select
                    value={project.captionStyle.animation}
                    onChange={(e) =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        captionStyle: { ...prev.captionStyle, animation: e.target.value as any },
                      }))
                    }
                    className="bg-gray-950 border border-gray-700 text-white rounded p-1 text-[11px]"
                  >
                    <option value="pop">Pop Impact</option>
                    <option value="bounce">Bounce</option>
                    <option value="karaoke">Karaoke</option>
                    <option value="fade">Fade</option>
                    <option value="none">Static</option>
                  </select>
                </div>

                {/* Uppercase Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                  <span className="text-gray-300 font-semibold">All Uppercase</span>
                  <input
                    type="checkbox"
                    checked={project.captionStyle.uppercase}
                    onChange={(e) =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        captionStyle: { ...prev.captionStyle, uppercase: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-yellow-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Timeline Segments List */}
            {captionSubTab === 'segments' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>Click segment to jump & edit</span>
                  <button
                    onClick={() => {
                      const newCap: TimelineCaption = {
                        id: `tc-${Date.now()}`,
                        text: 'NEW CAPTION BEAT',
                        startTime: Math.round(currentTime * 10) / 10,
                        endTime: Math.round((currentTime + 1.8) * 10) / 10,
                        duration: 1.8,
                      };
                      onUpdateProject((prev) => ({
                        ...prev,
                        timelineCaptions: [...prev.timelineCaptions, newCap].sort((a, b) => a.startTime - b.startTime),
                      }));
                      if (onSelectCaption) onSelectCaption(newCap.id);
                    }}
                    className="text-yellow-400 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add at Playhead</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-0.5">
                  {project.timelineCaptions.map((cap) => {
                    const isSelected = selectedCaptionId === cap.id;

                    return (
                      <div
                        key={cap.id}
                        onClick={() => {
                          if (onTimeSeek) onTimeSeek(cap.startTime);
                          if (onSelectCaption) onSelectCaption(cap.id);
                        }}
                        className={`p-2 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                          isSelected ? 'bg-yellow-950/30 border-yellow-400' : 'bg-[#0D0F16] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex-1 pr-2">
                          <input
                            type="text"
                            value={cap.text}
                            onChange={(e) => {
                              const newText = e.target.value;
                              onUpdateProject((prev) => ({
                                ...prev,
                                timelineCaptions: prev.timelineCaptions.map((c) =>
                                  c.id === cap.id ? { ...c, text: newText } : c
                                ),
                              }));
                            }}
                            className="w-full bg-transparent text-xs text-white font-bold focus:outline-none focus:text-yellow-300"
                          />
                          <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                            {cap.startTime.toFixed(1)}s - {cap.endTime.toFixed(1)}s ({cap.duration.toFixed(1)}s)
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateProject((prev) => ({
                              ...prev,
                              timelineCaptions: prev.timelineCaptions.filter((c) => c.id !== cap.id),
                            }));
                            if (onSelectCaption) onSelectCaption(null);
                          }}
                          className="p-1 text-gray-500 hover:text-red-400 rounded"
                          title="Delete this caption"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 4: EFFECTS ===================== */}
        {activeTab === 'effects' && (
          <div className="space-y-4">
            {/* Ken Burns Motion */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-200 block">Ken Burns Camera Motion</span>
              <p className="text-[11px] text-gray-400">Cinematic camera pans and zooms to keep viewer retention high:</p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'zoom-in' as KenBurnsEffect, name: 'Zoom In' },
                  { id: 'zoom-out' as KenBurnsEffect, name: 'Zoom Out' },
                  { id: 'pan-left' as KenBurnsEffect, name: 'Pan Left' },
                  { id: 'pan-right' as KenBurnsEffect, name: 'Pan Right' },
                  { id: 'float' as KenBurnsEffect, name: 'Dynamic Float' },
                  { id: 'none' as KenBurnsEffect, name: 'Static' },
                ].map((ef) => (
                  <button
                    key={ef.id}
                    onClick={() => handleApplyKenBurns(ef.id)}
                    className="p-2.5 rounded-lg bg-[#0D0F16] border border-gray-800 hover:border-cyan-400 text-left transition group"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-cyan-400 block">{ef.name}</span>
                    <span className="text-[9px] text-gray-500 mt-0.5 block">Apply All Clips</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Screen Effects */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <span className="text-xs font-bold text-gray-200 block">Visual Screen Effects</span>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'cinematic', name: 'Cinematic 35mm Grain', desc: 'Subtle motion texture with dark letterbox grading' },
                  { id: 'cyberpunk', name: 'Cyberpunk Neon Pulse', desc: 'Electric blue and magenta chromatic enhancement' },
                  { id: 'warm_film', name: 'Warm Golden Hour', desc: 'Lush golden highlights for storytelling' },
                  { id: 'noir', name: 'Film Noir Black & White', desc: 'High-contrast dramatic monochrome' },
                ].map((eff) => (
                  <div
                    key={eff.id}
                    onClick={() => handleApplyFilter(eff.id as VisualEffect)}
                    className="p-2 rounded-lg bg-[#0D0F16] border border-gray-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between transition group"
                  >
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition">{eff.name}</span>
                      <span className="text-[10px] text-gray-500 block">{eff.desc}</span>
                    </div>
                    <button className="px-2 py-0.5 rounded bg-gray-800 text-[10px] font-bold text-gray-300 group-hover:bg-cyan-500 group-hover:text-black transition">
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: TRANSITIONS ===================== */}
        {activeTab === 'transitions' && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-300 block">CapCut Video Transitions</span>
            <p className="text-[11px] text-gray-400 mb-2">Click to apply smooth transitions between clips:</p>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'crossfade' as TransitionType, name: 'Crossfade (Dissolve)', desc: 'Smooth cinematic blend between scenes' },
                { id: 'flash_white' as TransitionType, name: 'White Flash Dip', desc: 'High-energy white flash impact cut' },
                { id: 'slide' as TransitionType, name: 'Slide Left', desc: 'Fast dynamic camera whip across screen' },
                { id: 'blur_dissolve' as TransitionType, name: 'Blur Dissolve', desc: 'Soft defocus dreamlike transition' },
                { id: 'none' as TransitionType, name: 'Hard Cut', desc: 'Standard abrupt video cut' },
              ].map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => handleApplyTransition(tr.id)}
                  className="p-2.5 rounded-lg bg-[#0D0F16] border border-gray-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between transition group"
                >
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition">{tr.name}</span>
                    <span className="text-[10px] text-gray-500 block">{tr.desc}</span>
                  </div>
                  <button className="px-2 py-1 rounded bg-gray-800 text-[10px] font-bold text-gray-300 group-hover:bg-cyan-500 group-hover:text-black transition">
                    Apply All
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 6: FILTERS ===================== */}
        {activeTab === 'filters' && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-300 block">Cinematic Color Grading</span>
            <p className="text-[11px] text-gray-400 mb-2">1-Click color grading presets for consistent visual aesthetic:</p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cinematic' as VisualEffect, name: 'Cinematic' },
                { id: 'warm_film' as VisualEffect, name: 'Warm 35mm' },
                { id: 'moody_cold' as VisualEffect, name: 'Moody Cold' },
                { id: 'noir' as VisualEffect, name: 'Noir B&W' },
                { id: 'cyberpunk' as VisualEffect, name: 'Cyberpunk' },
                { id: 'vintage' as VisualEffect, name: 'Vintage' },
                { id: 'none' as VisualEffect, name: 'Original' },
              ].map((fl) => (
                <button
                  key={fl.id}
                  onClick={() => handleApplyFilter(fl.id)}
                  className="p-3 rounded-lg bg-[#0D0F16] border border-gray-800 hover:border-cyan-500 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">{fl.name}</span>
                  <span className="text-[10px] text-cyan-400 mt-1 block">Apply to Clips</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 7: THEMES ===================== */}
        {activeTab === 'themes' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-200 block">App Studio Themes</span>
            <p className="text-[11px] text-gray-400">Choose your preferred workspace aesthetic and color palette:</p>

            <div className="grid grid-cols-1 gap-2">
              {Object.values(APP_THEMES).map((th) => {
                const isSelected = project.theme === th.id;

                return (
                  <div
                    key={th.id}
                    onClick={() => onUpdateProject((prev) => ({ ...prev, theme: th.id }))}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      isSelected ? 'bg-cyan-950/30 border-cyan-400' : 'bg-[#0D0F16] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: th.previewColor }}
                        className="w-4 h-4 rounded-full shadow-md"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">{th.name}</span>
                        <span className="text-[10px] text-gray-500">CapCut Studio Theme</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== TAB 8: SCRIPT AI ===================== */}
        {activeTab === 'script' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white block">
                Gemini AI Script & Image Auto-Sync
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                Gemini 3.8 Flash
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Paste your video script. The AI backend analyzes spoken rhythm and aligns all {project.scenes.length} image durations, camera motions, and captions to the voiceover.
            </p>

            <textarea
              rows={7}
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              className="w-full bg-[#0D0F16] border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
              placeholder="Paste your video script here..."
            />

            <div className="space-y-2 pt-1">
              {/* Button 1: Adjust Existing Images */}
              <button
                onClick={handleAdjustExistingImagesToScript}
                disabled={isAdjustingImages || !scriptInput.trim() || project.scenes.length === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                {isAdjustingImages ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Auto-Adjust My {project.scenes.length} Images to Script</span>
              </button>

              {/* Button 2: Open Full AI Director Studio */}
              {onOpenAiDirector && (
                <button
                  onClick={onOpenAiDirector}
                  className="w-full py-2 rounded-xl bg-[#171924] hover:bg-[#202332] text-cyan-300 font-semibold text-xs border border-cyan-500/30 flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Full AI Director Studio Modal</span>
                </button>
              )}

              {/* Button 3: Generate New Scenes */}
              <button
                onClick={handleScriptBreakdown}
                disabled={isAiBreakingDown || !scriptInput.trim()}
                className="w-full py-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-300 font-medium text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {isAiBreakingDown ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Break Down Script into New Scenes</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
