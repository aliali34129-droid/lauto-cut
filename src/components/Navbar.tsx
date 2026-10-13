import React from 'react';
import { VideoProject, AspectRatio, AppTheme } from '../types/editor';
import { APP_THEMES } from '../data/themes';
import {
  Sparkles,
  Download,
  HelpCircle,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Music,
  Palette,
} from 'lucide-react';

interface NavbarProps {
  project: VideoProject;
  activeStep: 1 | 2 | 3;
  onSetStep: (step: 1 | 2 | 3) => void;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  onOpenExportModal: () => void;
  onOpenHelpModal: () => void;
  onLoadDemoProject: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  activeStep,
  onSetStep,
  onUpdateProject,
  onOpenExportModal,
  onOpenHelpModal,
  onLoadDemoProject,
}) => {
  const toggleAspectRatio = (ratio: AspectRatio) => {
    onUpdateProject((prev) => ({ ...prev, aspectRatio: ratio }));
  };

  const handleSelectTheme = (th: AppTheme) => {
    onUpdateProject((prev) => ({ ...prev, theme: th }));
  };

  const currentTheme = APP_THEMES[project.theme] || APP_THEMES.obsidian;

  return (
    <header className="h-16 bg-[#0B0F17] border-b border-gray-800/80 px-4 flex items-center justify-between select-none z-30">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-md shadow-red-600/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white font-['Cabinet_Grotesk']">
            AutoTube <span className="text-red-500 font-black">Studio</span>
          </span>
        </div>
      </div>

      {/* Zone 2: 3-Step Wizard Navigation */}
      <nav className="flex items-center bg-gray-950/80 p-1 rounded-xl border border-gray-800">
        <button
          onClick={() => onSetStep(1)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeStep === 1
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>1. Script & Voice</span>
        </button>

        <button
          onClick={() => onSetStep(2)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeStep === 2
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>2. Scene Images</span>
        </button>

        <button
          onClick={() => onSetStep(3)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeStep === 3
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>3. Style & Music</span>
        </button>
      </nav>

      {/* Zone 3: Theme Selector, Aspect Ratio, and Export */}
      <div className="flex items-center space-x-2">
        {/* Theme Selector */}
        <div className="hidden md:flex items-center space-x-1 bg-gray-900 px-2 py-1 rounded-lg border border-gray-800 text-xs">
          <Palette className="w-3.5 h-3.5 text-gray-400 mr-0.5" />
          <select
            value={project.theme}
            onChange={(e) => handleSelectTheme(e.target.value as AppTheme)}
            className="bg-transparent text-gray-300 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {Object.values(APP_THEMES).map((th) => (
              <option key={th.id} value={th.id} className="bg-gray-900 text-white">
                {th.name}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-gray-900 rounded-lg p-0.5 border border-gray-800 text-[11px] font-bold">
          <button
            onClick={() => toggleAspectRatio('16:9')}
            className={`px-2.5 py-1 rounded transition ${
              project.aspectRatio === '16:9'
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            16:9
          </button>
          <button
            onClick={() => toggleAspectRatio('9:16')}
            className={`px-2.5 py-1 rounded transition ${
              project.aspectRatio === '9:16'
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            9:16
          </button>
        </div>

        {/* Demo Sample button */}
        <button
          onClick={onLoadDemoProject}
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-medium border border-gray-700/60 transition"
          title="Load pre-built sample project"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Sample</span>
        </button>

        {/* Help button */}
        <button
          onClick={onOpenHelpModal}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          title="Editor Instructions & Workflow"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Primary Export CTA */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export HD</span>
        </button>
      </div>
    </header>
  );
};
