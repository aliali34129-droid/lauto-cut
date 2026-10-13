export type AspectRatio = '16:9' | '9:16';

export type KenBurnsEffect = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'float' | 'none';

export type TransitionType =
  | 'crossfade'
  | 'zoom'
  | 'slide'
  | 'flash_white'
  | 'blur_dissolve'
  | 'glitch'
  | 'none';

export type VisualEffect =
  | 'none'
  | 'cinematic'
  | 'warm_film'
  | 'moody_cold'
  | 'noir'
  | 'cyberpunk'
  | 'vintage'
  | 'vignette';

export type AppTheme = 'obsidian' | 'cyberpunk' | 'slate' | 'crimson' | 'royal';

export interface CaptionSegment {
  id: string;
  text: string;
  relativeStart: number; // seconds from scene start
  duration: number; // duration of this caption chunk
}

export interface TimelineCaption {
  id: string;
  text: string;
  startTime: number; // absolute seconds in timeline
  endTime: number;
  duration: number;
}

export type CaptionPreset = CaptionPresetId;

export type CaptionPresetId =
  | 'mrbeast_impact'
  | 'hormozi_highlighter'
  | 'hormozi_red'
  | 'ali_abdaal'
  | 'documentary_cinematic'
  | 'cyberpunk_neon'
  | 'vox_explainer'
  | 'magnates_media'
  | 'billionaire_gold'
  | 'tiktok_karaoke'
  | 'beast_bounce'
  | 'retro_vhs'
  | 'minimal_glass'
  | 'comic_pop'
  | 'breaking_news'
  | 'electric_purple'
  | 'subtle_slate'
  | 'gradient_fire'
  | 'matrix_green'
  | 'underline_slide'
  | 'dual_tone'
  | 'bold_outline';

export interface CaptionStyle {
  enabled: boolean;
  preset: CaptionPresetId;
  fontFamily: 'Cabinet Grotesk' | 'Montserrat' | 'Inter' | 'Playfair Display' | 'JetBrains Mono';
  fontSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  position: 'bottom' | 'center' | 'top';
  yOffsetPercent: number; // 10 to 90
  textColor: string; // Hex color
  highlightColor: string; // Active keyword color
  strokeColor: string;
  strokeWidth: number; // 0 to 12
  backgroundColor: string; // Box/pill background
  backgroundOpacity: number; // 0 to 1
  boxPadding: number;
  uppercase: boolean;
  shadow: boolean;
  shadowColor: string;
  glow: boolean;
  glowColor: string;
  animation: 'pop' | 'karaoke' | 'fade' | 'bounce' | 'none';
}

export interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  narration: string;
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds
  imageUrl: string;
  imageAlt?: string;
  visualPrompt?: string;
  searchKeywords?: string[];
  visualEffect?: VisualEffect;
  kenBurns: KenBurnsEffect;
  transition: TransitionType;
  captions: CaptionSegment[];
}

export interface MusicTrack {
  id: string;
  title: string;
  genre: string;
  mood: string;
  bpm: number;
  description: string;
  synthPreset: 'dark_mystery' | 'lofi_chill' | 'phonk_bass' | 'cinematic_ambient' | 'tech_corporate' | 'suspense_pulse';
}

export interface AudioSettings {
  voiceoverUrl: string | null;
  voiceoverFileName: string;
  voiceoverDuration: number;
  voiceoverVolume: number; // 0 to 1
  musicTrackId: string;
  musicCustomUrl: string | null;
  musicVolume: number; // 0 to 1
  autoDucking: boolean;
  duckingAmount: number;
}

export interface VideoProject {
  id: string;
  title: string;
  theme: AppTheme;
  aspectRatio: AspectRatio;
  scenes: Scene[];
  timelineCaptions: TimelineCaption[];
  audio: AudioSettings;
  captionStyle: CaptionStyle;
}
