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

export async function parseScriptWithAI(
  scriptText: string,
  totalDurationHint?: number,
  visualStyle?: string
): Promise<ParseScriptResponse> {
  const response = await fetch('/api/gemini/parse-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptText, totalDurationHint, visualStyle }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

export async function generateTTSWithAI(
  text: string,
  voiceName: string = 'Zephyr',
  speechStyle?: string
): Promise<{ audioBase64: string; mimeType: string; voiceName: string }> {
  const response = await fetch('/api/gemini/generate-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName, speechStyle }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate AI voiceover`);
  }

  return response.json();
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
