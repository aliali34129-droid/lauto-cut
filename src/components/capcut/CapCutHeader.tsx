import React from 'react';
import { VideoProject, AspectRatio, AppTheme } from '../../types/editor';
import { APP_THEMES } from '../../data/themes';
import {
  Sparkles,
  Download,
  FolderOpen,
  HelpCircle,
  Palette,
  Video,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react';

interface CapCutHeaderProps {
  project: VideoProject;
  studioMode: 'capcut' | 'wizard';
  onToggleMode: (mode: 'capcut' | 'wizard') => void;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onOpenExportModal: () => void;
  onOpenHelpModal: () => void;
  onLoadDemoProject: () => void;
  onAutoSyncScenes: () => void;
  onOpenAiDirector?: () => void;
}

export const CapCutHeader: React.FC<CapCutHeaderProps> = ({
  project,
  studioMode,
  onToggleMode,
  onUpdateProject,
  onOpenExportModal,
  onOpenHelpModal,
  onLoadDemoProject,
  onAutoSyncScenes,
  onOpenAiDirector,
}) => {
  const toggleAspectRatio = (ratio: AspectRatio) => {
    onUpdateProject((prev) => ({ ...prev, aspectRatio: ratio }));
  };

  const handleSelectTheme = (th: AppTheme) => {
    onUpdateProject((prev) => ({ ...prev, theme: th }));
  };

  const currentTheme = APP_THEMES[project.theme] || APP_THEMES.obsidian;

  return (
    <header className={`h-13 ${currentTheme.bgHeader} border-b ${currentTheme.border} px-4 flex items-center justify-between select-none z-30 shrink-0 transition-colors duration-200`}>
      {/* Zone 1: Wordmark & Project Meta */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm tracking-tight text-white font-['Cabinet_Grotesk']">
              AutoCut <span className="text-cyan-400 font-black">Studio</span>
            </span>
            <span className="hidden sm:inline text-[10px] text-gray-400 font-mono">
              CapCut Pro
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-gray-800 mx-1 hidden sm:block" />

        {/* Project Title Input */}
        <input
          type="text"
          value={project.title}
          onChange={(e) =>
            onUpdateProject((prev) => ({ ...prev, title: e.target.value }))
          }
          className="text-xs font-medium text-gray-300 bg-transparent hover:bg-gray-800/50 focus:bg-gray-800 px-2 py-1 rounded border border-transparent focus:border-cyan-500/50 outline-none transition w-40 md:w-56 truncate hidden md:block"
          placeholder="Untitled Project"
        />

        {/* View Switcher: CapCut Studio / Guided Wizard */}
        <div className="hidden sm:flex items-center bg-[#171922] rounded-lg p-0.5 border border-gray-800 text-[11px] font-semibold">
          <button
            onClick={() => onToggleMode('capcut')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
              studioMode === 'capcut'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>CapCut Studio</span>
          </button>
          <button
            onClick={() => onToggleMode('wizard')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
              studioMode === 'wizard'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Simple Wizard</span>
          </button>
        </div>
      </div>

      {/* Zone 2: Project Spec Indicators & Auto-Sync Action */}
      <div className="hidden lg:flex items-center space-x-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1 font-mono">
          <span className="text-gray-300 font-semibold">{project.scenes.length}</span> Clips
        </span>
        <span className="text-gray-700">·</span>
        <span className="font-mono text-gray-300">
          {(project.scenes[project.scenes.length - 1]?.endTime || 0).toFixed(1)}s Total
        </span>
        <span className="text-gray-700">·</span>
        <span className="text-cyan-400 font-mono text-[10px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
          1080p FHD
        </span>

        {/* Gemini AI Director Auto Sync Button */}
        <button
          onClick={onOpenAiDirector || onAutoSyncScenes}
          className="flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition ml-2 shadow-sm"
          title="Open Gemini AI Video Director to align images to script and voiceover"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>AI Auto-Sync (Script + Voice)</span>
        </button>
      </div>

      {/* Zone 3: Controls & Export CTA */}
      <div className="flex items-center space-x-2">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center bg-[#171922] rounded-lg p-0.5 border border-gray-800 text-[11px] font-bold">
          <button
            onClick={() => toggleAspectRatio('16:9')}
            className={`px-2.5 py-1 rounded transition ${
              project.aspectRatio === '16:9'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
            title="16:9 YouTube Long Form"
          >
            16:9
          </button>
          <button
            onClick={() => toggleAspectRatio('9:16')}
            className={`px-2.5 py-1 rounded transition ${
              project.aspectRatio === '9:16'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
            title="9:16 YouTube Shorts & Reels"
          >
            9:16
          </button>
        </div>

        {/* Theme Selector */}
        <div className="flex items-center space-x-1.5 bg-[#171922] px-2 py-1 rounded-lg border border-gray-700/70 text-xs shadow-xs">
          <Palette className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
            style={{ backgroundColor: currentTheme.previewColor }}
          />
          <select
            value={project.theme}
            onChange={(e) => handleSelectTheme(e.target.value as AppTheme)}
            className="bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            title="Switch Studio Theme"
          >
            {Object.values(APP_THEMES).map((th) => (
              <option key={th.id} value={th.id} className="bg-[#171922] text-white">
                {th.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sample Project */}
        <button
          onClick={onLoadDemoProject}
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-[#1C1F2B] hover:bg-[#25293A] text-gray-300 hover:text-white rounded-lg text-xs font-medium border border-gray-700/60 transition"
          title="Load pre-built sample YouTube automation project"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Demo</span>
        </button>

        {/* Help Guide */}
        <button
          onClick={onOpenHelpModal}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          title="Studio Guide & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* CapCut Prominent Export Button */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-cyan-600/20 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 1080p</span>
        </button>
      </div>
    </header>
  );
};
