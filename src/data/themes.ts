import { AppTheme } from '../types/editor';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  bgMain: string;
  bgCard: string;
  bgHeader: string;
  border: string;
  accent: string;
  accentHover: string;
  accentText: string;
  accentBadge: string;
  previewColor: string;
}

export const APP_THEMES: Record<AppTheme, ThemeConfig> = {
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Dark',
    bgMain: 'bg-[#07090E]',
    bgCard: 'bg-[#0D121C]',
    bgHeader: 'bg-[#0B0F17]',
    border: 'border-gray-800/80',
    accent: 'bg-red-600',
    accentHover: 'hover:bg-red-500',
    accentText: 'text-red-500',
    accentBadge: 'bg-red-500/10 text-red-400 border-red-500/20',
    previewColor: '#EF4444',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    bgMain: 'bg-[#050814]',
    bgCard: 'bg-[#0A1026]',
    bgHeader: 'bg-[#070D1F]',
    border: 'border-cyan-900/50',
    accent: 'bg-cyan-500',
    accentHover: 'hover:bg-cyan-400',
    accentText: 'text-cyan-400',
    accentBadge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    previewColor: '#06B6D4',
  },
  slate: {
    id: 'slate',
    name: 'Slate Minimalist',
    bgMain: 'bg-[#0B0F19]',
    bgCard: 'bg-[#111827]',
    bgHeader: 'bg-[#0F172A]',
    border: 'border-slate-800',
    accent: 'bg-blue-600',
    accentHover: 'hover:bg-blue-500',
    accentText: 'text-blue-400',
    accentBadge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    previewColor: '#3B82F6',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Studio',
    bgMain: 'bg-[#0A0709]',
    bgCard: 'bg-[#140E12]',
    bgHeader: 'bg-[#100A0E]',
    border: 'border-rose-950/60',
    accent: 'bg-rose-600',
    accentHover: 'hover:bg-rose-500',
    accentText: 'text-rose-500',
    accentBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    previewColor: '#E11D48',
  },
  royal: {
    id: 'royal',
    name: 'Royal Gold',
    bgMain: 'bg-[#090714]',
    bgCard: 'bg-[#120E24]',
    bgHeader: 'bg-[#0E0A1D]',
    border: 'border-purple-900/50',
    accent: 'bg-amber-500',
    accentHover: 'hover:bg-amber-400',
    accentText: 'text-amber-400',
    accentBadge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    previewColor: '#F59E0B',
  },
};
