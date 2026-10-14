import { Scene, CaptionSegment } from '../types/editor';

export interface ParseScriptResponse {
  videoTitle: string;
  hookAnalysis?: string;
  scenes: {
    sceneNumber: number;
    title: string;
    narration: string;
    duration: number;
    visualPrompt: string;
    searchKeywords: string[];
    kenBurns: string;
    transition: string;
    captions: {
      text: string;
      relativeStart: number;
      duration: number;
    }[];
  }[];
}

export function parseScriptLocally(
  scriptText: string,
  totalDurationHint?: number,
  visualStyle?: string
): ParseScriptResponse {
  const rawParagraphs = scriptText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  if (rawParagraphs.length > 1) {
    chunks.push(...rawParagraphs);
  } else {
    // Split by sentences if single block of text
    const sentences = scriptText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [scriptText];
    let temp = '';
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if (temp.length + trimmed.length > 150 && temp.length > 0) {
        chunks.push(temp.trim());
        temp = trimmed;
      } else {
        temp += (temp ? ' ' : '') + trimmed;
      }
    }
    if (temp.trim()) chunks.push(temp.trim());
  }

  const finalChunks = chunks.length > 0 ? chunks : [scriptText || 'Scene description'];
  const kenBurnsEffects = ['zoom-in', 'pan-right', 'zoom-out', 'pan-left', 'pan-up', 'tilt-down'];
  const transitions = ['crossfade', 'slide-left', 'zoom-in', 'wipe-right', 'glitch'];

  const scenes = finalChunks.map((narration, index) => {
    const wordCount = narration.split(/\s+/).filter(Boolean).length;
    const calcDur = Math.max(3.0, Math.round((wordCount / 2.3 + 1.2) * 10) / 10);
    const duration = totalDurationHint
      ? Math.max(2.5, Math.round((totalDurationHint / finalChunks.length) * 10) / 10)
      : calcDur;

    return {
      sceneNumber: index + 1,
      title: `Scene ${index + 1}`,
      narration,
      duration,
      visualPrompt: `${visualStyle || 'Cinematic photorealistic'}, ${narration.slice(0, 70)}`,
      searchKeywords: narration.split(/\s+/).filter((w) => w.length > 3).slice(0, 3),
      kenBurns: kenBurnsEffects[index % kenBurnsEffects.length],
      transition: transitions[index % transitions.length],
      captions: [
        {
          text: narration,
          relativeStart: 0,
          duration,
        },
      ],
    };
  });

  return {
    videoTitle: 'AutoCut Project',
    hookAnalysis: 'Automated scene segmentation generated.',
    scenes,
  };
}

export async function parseScriptWithAI(
  scriptText: string,
  totalDurationHint?: number,
  visualStyle?: string
): Promise<ParseScriptResponse> {
  try {
    const response = await fetch('/api/gemini/parse-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText, totalDurationHint, visualStyle }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Backend API unavailable, using client-side parser fallback:', err);
  }

  // Graceful client-side fallback (e.g. for GitHub Pages static hosting)
  return parseScriptLocally(scriptText, totalDurationHint, visualStyle);
}

export async function generateTTSWithAI(
  text: string,
  voiceName: string = 'Zephyr',
  speechStyle?: string
): Promise<{ audioBase64: string; mimeType: string; voiceName: string }> {
  try {
    const response = await fetch('/api/gemini/generate-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, speechStyle }),
    });

    if (response.ok) {
      return await response.json();
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Voiceover error: ${response.status}`);
  } catch (err: any) {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('github.io') || err?.message?.includes('Failed to fetch') || err?.message?.includes('404'))) {
      throw new Error(
        'AI Voice generation requires backend server with GEMINI_API_KEY. On static GitHub Pages, upload your audio voiceover file (MP3/WAV) using the Upload button or run locally.'
      );
    }
    throw err;
  }
}

export interface SmartAiSyncResult {
  scenes: Scene[];
  timelineCaptions: {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    duration: number;
  }[];
  totalDuration: number;
  aiPowered: boolean;
}

export async function smartAiSyncWithVoiceAndScript(
  scriptText: string,
  scenes: Scene[],
  totalAudioDuration: number,
  pacingStyle?: string
): Promise<SmartAiSyncResult> {
  const response = await fetch('/api/gemini/smart-ai-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptText, scenes, totalAudioDuration, pacingStyle }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to run Gemini AI Smart Sync`);
  }

  return response.json();
}

export async function syncTimingsWithAI(
  scenes: Scene[],
  totalAudioDuration: number,
  scriptText?: string
): Promise<{ scenes: Scene[]; totalDuration: number }> {
  try {
    const smart = await smartAiSyncWithVoiceAndScript(
      scriptText || scenes.map((s) => s.narration).join('\n'),
      scenes,
      totalAudioDuration
    );
    return { scenes: smart.scenes, totalDuration: smart.totalDuration };
  } catch (err) {
    const response = await fetch('/api/gemini/sync-timing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenes, totalAudioDuration }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to sync timings`);
    }

    return response.json();
  }
}

/**
 * Helper to transform AI scenes response into full Scene objects
 */
export function buildScenesFromAI(aiScenes: ParseScriptResponse['scenes'], defaultImages: string[] = []): Scene[] {
  let currentTime = 0;

  return aiScenes.map((aiScene, index) => {
    const dur = Math.max(2.0, aiScene.duration || 4.5);
    const start = Math.round(currentTime * 10) / 10;
    currentTime += dur;
    const end = Math.round(currentTime * 10) / 10;

    const fallbackImg = defaultImages[index % (defaultImages.length || 1)] ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&auto=format&fit=crop&q=80';

    const captions: CaptionSegment[] = (aiScene.captions || []).map((cap, cIdx) => ({
      id: `cap-${index}-${cIdx}`,
      text: cap.text,
      relativeStart: cap.relativeStart ?? cIdx * (dur / Math.max(1, aiScene.captions.length)),
      duration: cap.duration ?? (dur / Math.max(1, aiScene.captions.length)),
    }));

    return {
      id: `scene-${Date.now()}-${index}`,
      sceneNumber: index + 1,
      title: aiScene.title || `Scene ${index + 1}`,
      narration: aiScene.narration || '',
      startTime: start,
      endTime: end,
      duration: Math.round(dur * 10) / 10,
      imageUrl: fallbackImg,
      visualPrompt: aiScene.visualPrompt,
      searchKeywords: aiScene.searchKeywords || [],
      kenBurns: (aiScene.kenBurns as any) || (index % 2 === 0 ? 'zoom-in' : 'pan-right'),
      transition: (aiScene.transition as any) || 'crossfade',
      captions: captions.length > 0 ? captions : [
        {
          id: `cap-${index}-0`,
          text: aiScene.narration || '',
          relativeStart: 0,
          duration: dur,
        },
      ],
    };
  });
}
