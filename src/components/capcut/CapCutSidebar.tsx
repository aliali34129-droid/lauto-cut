import React from 'react';
import {
  Folder,
  Music,
  Type,
  Layers,
  Sparkles,
  FileText,
  Sliders,
  Palette,
  Wand2,
} from 'lucide-react';

export type CapCutTab =
  | 'media'
  | 'audio'
  | 'text'
  | 'effects'
  | 'transitions'
  | 'filters'
  | 'themes'
  | 'script';

interface CapCutSidebarProps {
  activeTab: CapCutTab;
  onSelectTab: (tab: CapCutTab) => void;
}

export const CapCutSidebar: React.FC<CapCutSidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const TABS: { id: CapCutTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'media', label: 'Media', icon: Folder },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'effects', label: 'Effects', icon: Wand2 },
    { id: 'transitions', label: 'Transitions', icon: Layers },
    { id: 'filters', label: 'Filters', icon: Sliders },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'script', label: 'Script AI', icon: FileText },
  ];

  return (
    <aside className="w-16 bg-[#111319] border-r border-gray-800/80 flex flex-col items-center py-2.5 space-y-1 select-none shrink-0 z-20">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`w-13 h-12 rounded-xl flex flex-col items-center justify-center transition group relative ${
              isActive
                ? 'bg-cyan-500/15 text-cyan-400 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60 font-medium'
            }`}
            title={tab.label}
          >
            {/* Active Left Pill Indicator */}
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-cyan-400 rounded-r" />
            )}
            <Icon className={`w-4 h-4 mb-0.5 transition ${isActive ? 'text-cyan-400' : 'group-hover:text-white'}`} />
            <span className="text-[9px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </aside>
  );
};
