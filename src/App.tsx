import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VideoProject, Scene } from './types/editor';
import { DEFAULT_PROJECT } from './data/defaultProject';
import { APP_THEMES } from './data/themes';
import { AudioEngine } from './services/audioEngine';
import { syncTimingsWithAI, smartAiSyncWithVoiceAndScript } from './services/geminiService';

// CapCut Layout Components
import { CapCutHeader } from './components/capcut/CapCutHeader';
import { CapCutSidebar, CapCutTab } from './components/capcut/CapCutSidebar';
import { CapCutDrawer } from './components/capcut/CapCutDrawer';
import { CapCutMonitor } from './components/capcut/CapCutMonitor';
import { CapCutInspector } from './components/capcut/CapCutInspector';
import { CapCutTimeline } from './components/capcut/CapCutTimeline';

// Guided Wizard Components (Accessible via header toggle)
import { Navbar } from './components/Navbar';
import { StepScriptVoice } from './components/StepScriptVoice';
import { StepSceneImages } from './components/StepSceneImages';
import { StepStyleMusic } from './components/StepStyleMusic';
import { StudioPlayer } from './components/StudioPlayer';

// Modals
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { AiDirectorModal } from './components/capcut/AiDirectorModal';
import {
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Music,
} from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<VideoProject>(DEFAULT_PROJECT);
  const [studioMode, setStudioMode] = useState<'capcut' | 'wizard'>('capcut');
  const [activeCapCutTab, setActiveCapCutTab] = useState<CapCutTab>('media');
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    DEFAULT_PROJECT.scenes[0]?.id || null
  );
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [showAiDirectorModal, setShowAiDirectorModal] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Persistent Audio Engine
  const audioEngine = useMemo(() => new AudioEngine(), []);

  // Sync initial music preset with audioEngine
  useEffect(() => {
    const track = project.audio.musicTrackId;
    if (track === 'track-dark-mystery') audioEngine.setMusicTrackPreset('dark_mystery');
    else if (track === 'track-lofi-chill') audioEngine.setMusicTrackPreset('lofi_chill');
    else if (track === 'track-phonk-bass') audioEngine.setMusicTrackPreset('phonk_bass');
    else if (track === 'track-cinematic-ambient') audioEngine.setMusicTrackPreset('cinematic_ambient');
    else if (track === 'track-tech-corporate') audioEngine.setMusicTrackPreset('tech_corporate');
    else if (track === 'track-suspense-pulse') audioEngine.setMusicTrackPreset('suspense_pulse');

    audioEngine.setVoiceoverVolume(project.audio.voiceoverVolume);
    audioEngine.setMusicVolume(project.audio.musicVolume);
    audioEngine.setAutoDucking(project.audio.autoDucking, project.audio.duckingAmount);

    return () => {
      audioEngine.destroy();
    };
  }, [audioEngine]);

  // Spacebar shortcut to Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, project.audio.musicCustomUrl]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      const totalDur = project.scenes[project.scenes.length - 1]?.endTime || 10;
      const startAt = currentTime >= totalDur ? 0 : currentTime;
      if (startAt === 0 && currentTime >= totalDur) {
        setCurrentTime(0);
      }
      audioEngine.play(startAt, !!project.audio.musicCustomUrl);
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, audioEngine, project.audio.musicCustomUrl, project.scenes]);

  // Time seek handler
  const handleTimeUpdate = useCallback(
    (newTime: number) => {
      setCurrentTime(newTime);
      const active = project.scenes.find(
        (s) => newTime >= s.startTime && newTime < s.endTime
      );
      if (active && active.id !== selectedSceneId) {
        setSelectedSceneId(active.id);
      }
    },
    [project.scenes, selectedSceneId]
  );

  // 1-Click Auto-Sync Scenes to Voiceover Duration with Gemini AI
  const handleAutoSyncScenes = useCallback(
    async (targetDuration?: number, scriptText?: string) => {
      const durationToUse =
        targetDuration ||
        project.audio.voiceoverDuration ||
        project.scenes.reduce((acc, s) => acc + s.duration, 0);

      const scriptToUse =
        scriptText ||
        project.scenes.map((s) => s.narration || '').join('\n');

      try {
        const smart = await smartAiSyncWithVoiceAndScript(
          scriptToUse,
          project.scenes,
          durationToUse
        );
        setProject((prev) => ({
          ...prev,
          scenes: smart.scenes,
          timelineCaptions:
            smart.timelineCaptions && smart.timelineCaptions.length > 0
              ? smart.timelineCaptions
              : prev.timelineCaptions,
        }));
        showToast(
          `✓ All ${smart.scenes.length} scenes synchronized accurately to ${durationToUse.toFixed(1)}s voiceover!`
        );
      } catch (err) {
        // Fallback proportional math
        const totalWords = project.scenes.reduce((acc, s) => {
          const w = (s.narration || '').trim().split(/\s+/).filter(Boolean).length;
          return acc + Math.max(w, 3);
        }, 0);

        let accum = 0;
        const recalculated = project.scenes.map((s, idx) => {
          const words = (s.narration || '').trim().split(/\s+/).filter(Boolean).length;
          const weight = Math.max(words, 3) / totalWords;
          let dur: number;
          if (idx === project.scenes.length - 1) {
            dur = Math.max(1.0, durationToUse - accum);
          } else {
            dur = Math.max(1.5, Math.round(weight * durationToUse * 10) / 10);
          }
          const start = Math.round(accum * 10) / 10;
          accum += dur;
          const end = Math.round(accum * 10) / 10;

          return {
            ...s,
            startTime: start,
            endTime: end,
            duration: Math.round(dur * 10) / 10,
          };
        });

        setProject((prev) => ({ ...prev, scenes: recalculated }));
        showToast(`✓ Scenes auto-aligned to ${durationToUse.toFixed(1)}s voiceover!`);
      }
    },
    [project.scenes, project.audio.voiceoverDuration]
  );

  // Load sample demo project
  const handleLoadDemoProject = () => {
    setProject(DEFAULT_PROJECT);
    setCurrentTime(0);
    setIsPlaying(false);
    audioEngine.pause();
    setSelectedSceneId(DEFAULT_PROJECT.scenes[0]?.id || null);
    setSelectedCaptionId(null);
    showToast('✓ Sample YouTube automation project loaded!');
  };

  const themeConfig = APP_THEMES[project.theme] || APP_THEMES.obsidian;
  const selectedScene = project.scenes.find((s) => s.id === selectedSceneId) || project.scenes[0] || null;

  return (
    <div className={`flex flex-col h-screen w-screen ${themeConfig.bgMain} text-white font-sans antialiased overflow-hidden select-none`}>
      {studioMode === 'capcut' ? (
        /* ================= CAPCUT PRO STUDIO LAYOUT (DEFAULT) ================= */
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Top CapCut Header */}
          <CapCutHeader
            project={project}
            studioMode={studioMode}
            onToggleMode={setStudioMode}
            onUpdateProject={setProject}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenHelpModal={() => setIsHelpModalOpen(true)}
            onLoadDemoProject={handleLoadDemoProject}
            onAutoSyncScenes={() => handleAutoSyncScenes()}
            onOpenAiDirector={() => setShowAiDirectorModal(true)}
          />

          {/* Middle Row: Left Sidebar + Drawer + Center Monitor + Right Inspector */}
          <div className="flex-1 flex flex-row overflow-hidden min-h-0">
            {/* 1. Left Vertical Icon Sidebar */}
            <CapCutSidebar
              activeTab={activeCapCutTab}
              onSelectTab={setActiveCapCutTab}
            />

            {/* 2. Asset & Tools Drawer */}
            <CapCutDrawer
              activeTab={activeCapCutTab}
              project={project}
              audioEngine={audioEngine}
              onUpdateProject={setProject}
              onSelectScene={(scene) => {
                setSelectedSceneId(scene.id);
                setCurrentTime(scene.startTime);
              }}
              selectedSceneId={selectedSceneId}
              onAutoSyncScenes={(dur) => handleAutoSyncScenes(dur)}
              currentTime={currentTime}
              onTimeSeek={(t) => {
                setCurrentTime(t);
                audioEngine.seek(t, isPlaying, !!project.audio.musicCustomUrl);
              }}
              selectedCaptionId={selectedCaptionId}
              onSelectCaption={setSelectedCaptionId}
              onOpenAiDirector={() => setShowAiDirectorModal(true)}
            />

            {/* 3. Center Real-Time Video Monitor */}
            <div className="flex-1 flex flex-col bg-[#08090D] overflow-hidden min-w-0">
              <CapCutMonitor
                project={project}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTimeUpdate={handleTimeUpdate}
                onTogglePlay={togglePlay}
                audioEngine={audioEngine}
              />
            </div>

            {/* 4. Right Property Inspector */}
            <CapCutInspector
              project={project}
              selectedScene={selectedScene}
              selectedCaptionId={selectedCaptionId}
              onSelectCaption={setSelectedCaptionId}
              onUpdateProject={setProject}
              onTimeSeek={(t) => {
                setCurrentTime(t);
                audioEngine.seek(t, isPlaying, !!project.audio.musicCustomUrl);
              }}
            />
          </div>

          {/* Bottom Row: CapCut Magnetic Multi-Layer Timeline */}
          <CapCutTimeline
            project={project}
            currentTime={currentTime}
            onTimeUpdate={(t) => {
              setCurrentTime(t);
              audioEngine.seek(t, isPlaying, !!project.audio.musicCustomUrl);
            }}
            selectedSceneId={selectedSceneId}
            onSelectScene={(scene) => {
              setSelectedSceneId(scene.id);
              setSelectedCaptionId(null);
            }}
            selectedCaptionId={selectedCaptionId}
            onSelectCaption={setSelectedCaptionId}
            onUpdateProject={setProject}
            audioEngine={audioEngine}
            onAutoSyncScenes={() => handleAutoSyncScenes()}
            onOpenAiDirector={() => setShowAiDirectorModal(true)}
          />
        </div>
      ) : (
        /* ================= GUIDED 3-STEP WIZARD (ACCESSIBLE VIA HEADER TOGGLE) ================= */
        <div className="flex flex-col h-full w-full overflow-hidden">
          <Navbar
            project={project}
            activeStep={activeStep}
            onSetStep={setActiveStep}
            onUpdateProject={setProject}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenHelpModal={() => setIsHelpModalOpen(true)}
            onLoadDemoProject={handleLoadDemoProject}
          />

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-5 gap-4">
            {/* Left Column: 3-Step Wizard Workspace */}
            <div className={`w-full lg:w-[54%] xl:w-[50%] h-full flex flex-col ${themeConfig.bgCard} rounded-2xl border ${themeConfig.border} overflow-hidden shadow-xl`}>
              <div className="h-12 px-4 bg-black/40 border-b border-gray-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold">
                  <button
                    onClick={() => setActiveStep(1)}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      activeStep === 1
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Step 1: Script & Voice</span>
                  </button>

                  <button
                    onClick={() => setActiveStep(2)}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      activeStep === 2
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Step 2: Images & Effects</span>
                  </button>

                  <button
                    onClick={() => setActiveStep(3)}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      activeStep === 3
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Step 3: Style & Music</span>
                  </button>
                </div>

                <button
                  onClick={() => setStudioMode('capcut')}
                  className="text-xs font-bold text-cyan-400 hover:underline"
                >
                  Switch to CapCut Studio &rarr;
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {activeStep === 1 && (
                  <StepScriptVoice
                    project={project}
                    audioEngine={audioEngine}
                    onUpdateProject={setProject}
                    onNextStep={() => setActiveStep(2)}
                    onAutoSyncScenes={handleAutoSyncScenes}
                  />
                )}

                {activeStep === 2 && (
                  <StepSceneImages
                    project={project}
                    onUpdateProject={setProject}
                    onPrevStep={() => setActiveStep(1)}
                    onNextStep={() => setActiveStep(3)}
                    onAutoSyncScenes={() => handleAutoSyncScenes()}
                    onSelectScene={(scene) => {
                      setSelectedSceneId(scene.id);
                      setCurrentTime(scene.startTime);
                      audioEngine.seek(scene.startTime, isPlaying, !!project.audio.musicCustomUrl);
                    }}
                    selectedSceneId={selectedSceneId}
                  />
                )}

                {activeStep === 3 && (
                  <StepStyleMusic
                    project={project}
                    audioEngine={audioEngine}
                    onUpdateProject={setProject}
                    onPrevStep={() => setActiveStep(2)}
                    onOpenExportModal={() => setIsExportModalOpen(true)}
                  />
                )}
              </div>
            </div>

            {/* Right Column: Live Studio Player */}
            <div className="w-full lg:w-[46%] xl:w-[50%] h-full flex flex-col">
              <StudioPlayer
                project={project}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTimeUpdate={handleTimeUpdate}
                onTogglePlay={togglePlay}
                audioEngine={audioEngine}
                onSelectScene={(scene) => setSelectedSceneId(scene.id)}
                selectedSceneId={selectedSceneId}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onUpdateProject={setProject}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-black/95 text-white px-4 py-2.5 rounded-xl border border-emerald-500/50 shadow-2xl backdrop-blur-md flex items-center space-x-2 text-xs font-semibold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Export HD Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        audioEngine={audioEngine}
      />

      {/* Guide Modal (English) */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Gemini AI Video Director Modal */}
      <AiDirectorModal
        isOpen={showAiDirectorModal}
        onClose={() => setShowAiDirectorModal(false)}
        project={project}
        onUpdateProject={setProject}
        onShowToast={showToast}
        audioEngine={audioEngine}
      />
    </div>
  );
}
