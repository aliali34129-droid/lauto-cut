import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * 1. Parse Script into synchronized video scenes with visual prompts and caption timings
 */
app.post('/api/gemini/parse-script', async (req, res) => {
  try {
    const { scriptText, totalDurationHint, visualStyle } = req.body;
    if (!scriptText || typeof scriptText !== 'string' || scriptText.trim().length === 0) {
      return res.status(400).json({ error: 'Script text is required.' });
    }

    const ai = getAiClient();

    const prompt = `
You are a senior YouTube Automation Video Director and Editor specializing in high-retention documentary, video essay, and faceless YouTube channels.
Analyze the following script and break it down into clean, professional scenes.
Each scene must correspond to a distinct visual beat and narration sentence/phrase.
CRITICAL: Timings must be realistic for spoken narration (~2.5 words per second).

Script:
"""
${scriptText.trim()}
"""

${totalDurationHint ? `Target total video duration is approximately ${totalDurationHint} seconds.` : ''}
Visual style preference: ${visualStyle || 'Cinematic Documentary, photorealistic, high quality'}.

Break the script down into an array of scenes.
For each scene:
1. sceneNumber (1, 2, 3...)
2. title: short evocative scene name (e.g., "The Hook", "Mystery Unfolds", "Key Evidence")
3. narration: the exact spoken words for this scene
4. duration: estimated duration in seconds (between 3.0 and 8.0 seconds per scene for strong YouTube pacing)
5. visualPrompt: ultra-descriptive prompt for generating or finding the best YouTube B-roll image
6. searchKeywords: 2-4 keywords for matching stock images
7. kenBurns: one of ["zoom-in", "zoom-out", "pan-left", "pan-right"]
8. transition: one of ["crossfade", "zoom", "slide", "none"]
9. captions: array of short caption phrases (3-6 words each) with relative start times within the scene so words can be animated dynamically like Hormozi/MrBeast subtitles.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            videoTitle: { type: Type.STRING },
            hookAnalysis: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                  visualPrompt: { type: Type.STRING },
                  searchKeywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  kenBurns: { type: Type.STRING },
                  transition: { type: Type.STRING },
                  captions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        relativeStart: { type: Type.NUMBER },
                        duration: { type: Type.NUMBER },
                      },
                      required: ['text', 'relativeStart', 'duration'],
                    },
                  },
                },
                required: [
                  'sceneNumber',
                  'title',
                  'narration',
                  'duration',
                  'visualPrompt',
                  'searchKeywords',
                  'kenBurns',
                  'transition',
                  'captions',
                ],
              },
            },
          },
          required: ['videoTitle', 'scenes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing script with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze script with AI.',
    });
  }
});

/**
 * 2. Generate Voiceover TTS using gemini-3.8-flash-lite-tts
 */
app.post('/api/gemini/generate-tts', async (req, res) => {
  try {
    const { text, voiceName = 'Zephyr', speechStyle = 'Engaging, clear, professional YouTube documentary narrator' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS generation.' });
    }

    const ai = getAiClient();

    const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const selectedVoice = allowedVoices.includes(voiceName) ? voiceName : 'Zephyr';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: speechStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from TTS model.' });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voiceName: selectedVoice,
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate voiceover with AI.',
    });
  }
});

/**
 * 3. Professional AI Smart Sync: Gemini 3.8 Flash aligns script, visual assets/images, and voiceover duration
 */
app.post('/api/gemini/smart-ai-sync', async (req, res) => {
  try {
    const { scriptText, scenes, totalAudioDuration, pacingStyle = 'YouTube Automation High Retention' } = req.body;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'At least one scene/image is required for synchronization.' });
    }

    const duration = parseFloat(totalAudioDuration) || 30.0;
    const script = (scriptText && typeof scriptText === 'string' && scriptText.trim().length > 0)
      ? scriptText.trim()
      : scenes.map((s: any) => s.narration || '').join('\n');

    let aiResult: any = null;

    try {
      const ai = getAiClient();
      const prompt = `
You are an elite YouTube Automation Post-Production Director & Audio-Visual Alignment Engineer.
Your mission is to PERFECTLY synchronize ${scenes.length} visual images/scenes with a spoken voiceover audio track and script.

INPUTS:
- Script Text:
"""
${script}
"""
- Voiceover Audio Target Duration: ${duration.toFixed(2)} seconds.
- Number of Visual Assets / Images provided: ${scenes.length}.
- Target Pacing Style: ${pacingStyle}.

CRITICAL SYNCHRONIZATION RULES:
1. Divide the provided script across exactly ${scenes.length} scenes.
   Each scene corresponds to one of the user's provided images in sequence (Index 0 to ${scenes.length - 1}).
2. Natural Speech Cadence Modeling:
   - Account for syllable lengths, commas (pause ~0.25s), periods (pause ~0.45s), and dramatic emphasis pauses.
   - Assign exact startTime, endTime, and duration (in seconds) to each scene.
3. MATHEMATICAL LOCK (STRICT):
   - Scene 0 startTime MUST be 0.0s.
   - Each scene startTime MUST equal the previous scene endTime (zero gaps, zero overlaps).
   - The final scene endTime MUST equal EXACTLY ${duration.toFixed(2)}s.
   - Every scene duration MUST be at least 1.0s.
   - The sum of all scene durations MUST equal ${duration.toFixed(2)}s.
4. For each scene:
   - sceneIndex: integer from 0 to ${scenes.length - 1}
   - title: short evocative scene label (e.g. "Hook & Question", "System Breakdown", "Visual Reveal")
   - narration: the exact spoken words corresponding to this visual asset
   - duration: float in seconds
   - kenBurns: one of ["zoom-in", "zoom-out", "pan-left", "pan-right", "float"] chosen to amplify retention
   - transition: one of ["crossfade", "slide", "flash_white", "blur_dissolve"]
   - captions: array of 2 to 4 words punchy subtitle beats with relativeStart (seconds from scene start) and duration.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneIndex: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    narration: { type: Type.STRING },
                    duration: { type: Type.NUMBER },
                    kenBurns: { type: Type.STRING },
                    transition: { type: Type.STRING },
                    captions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          relativeStart: { type: Type.NUMBER },
                          duration: { type: Type.NUMBER },
                        },
                        required: ['text', 'relativeStart', 'duration'],
                      },
                    },
                  },
                  required: ['sceneIndex', 'title', 'narration', 'duration', 'kenBurns', 'transition', 'captions'],
                },
              },
            },
            required: ['scenes'],
          },
        },
      });

      aiResult = JSON.parse(response.text || '{}');
    } catch (aiErr) {
      console.warn('Gemini AI Smart Sync fallback to algorithmic cadence:', aiErr);
    }

    // Merge AI result with existing images and strictly normalize timings to eliminate any rounding drift
    const aiScenesList = aiResult?.scenes && Array.isArray(aiResult.scenes) && aiResult.scenes.length === scenes.length
      ? aiResult.scenes
      : null;

    let accum = 0;
    const finalScenes = scenes.map((origScene: any, idx: number) => {
      const aiScene = aiScenesList ? aiScenesList[idx] : null;

      let dur: number;
      if (aiScene && typeof aiScene.duration === 'number' && aiScene.duration > 0.5) {
        dur = aiScene.duration;
      } else {
        // Fallback proportional weight
        const totalWords = scenes.reduce((a: number, s: any) => {
          const w = (s.narration || '').trim().split(/\s+/).filter(Boolean).length;
          return a + Math.max(w, 3);
        }, 0);
        const w = (origScene.narration || '').trim().split(/\s+/).filter(Boolean).length;
        const weight = Math.max(w, 3) / Math.max(1, totalWords);
        dur = Math.round(weight * duration * 10) / 10;
      }

      // If last scene, strictly snap to target duration to ensure 0.0s drift
      if (idx === scenes.length - 1) {
        dur = Math.max(1.0, Math.round((duration - accum) * 10) / 10);
      } else {
        dur = Math.max(1.0, Math.round(dur * 10) / 10);
      }

      const start = Math.round(accum * 10) / 10;
      accum += dur;
      const end = Math.round(accum * 10) / 10;

      // Extract captions
      let captions = origScene.captions || [];
      if (aiScene?.captions && Array.isArray(aiScene.captions)) {
        captions = aiScene.captions.map((c: any, cIdx: number) => ({
          id: `cap-${idx}-${cIdx}-${Date.now()}`,
          text: c.text,
          relativeStart: Math.round((c.relativeStart || 0) * 10) / 10,
          duration: Math.round((c.duration || 1.2) * 10) / 10,
        }));
      }

      return {
        ...origScene,
        sceneNumber: idx + 1,
        title: aiScene?.title || origScene.title || `Scene ${idx + 1}`,
        narration: aiScene?.narration || origScene.narration,
        duration: dur,
        startTime: start,
        endTime: end,
        kenBurns: aiScene?.kenBurns || origScene.kenBurns || (idx % 2 === 0 ? 'zoom-in' : 'pan-right'),
        transition: aiScene?.transition || origScene.transition || 'crossfade',
        captions,
      };
    });

    // Generate timelineCaptions array for the dedicated Captions Track
    const timelineCaptions: any[] = [];
    let capCounter = 1;
    finalScenes.forEach((sc) => {
      if (sc.captions && sc.captions.length > 0) {
        sc.captions.forEach((c: any) => {
          const capStart = Math.round((sc.startTime + c.relativeStart) * 10) / 10;
          const capEnd = Math.round((capStart + c.duration) * 10) / 10;
          timelineCaptions.push({
            id: `tc-${capCounter++}`,
            text: c.text,
            startTime: capStart,
            endTime: capEnd,
            duration: Math.round((capEnd - capStart) * 10) / 10,
          });
        });
      }
    });

    return res.json({
      scenes: finalScenes,
      timelineCaptions,
      totalDuration: duration,
      aiPowered: !!aiScenesList,
    });
  } catch (error: any) {
    console.error('Error in AI Smart Sync:', error);
    return res.status(500).json({ error: error?.message || 'Failed to synchronize scenes with AI.' });
  }
});

/**
 * 4. Legacy Timing Sync compatibility endpoint
 */
app.post('/api/gemini/sync-timing', async (req, res) => {
  try {
    const { scenes, totalAudioDuration, scriptText } = req.body;
    if (!scenes || !Array.isArray(scenes) || !totalAudioDuration || totalAudioDuration <= 0) {
      return res.status(400).json({ error: 'Valid scenes array and totalAudioDuration are required.' });
    }

    // Delegate to smart AI sync logic
    const duration = parseFloat(totalAudioDuration);
    const totalWords = scenes.reduce((acc: number, scene: any) => {
      const words = (scene.narration || '').trim().split(/\s+/).filter(Boolean).length;
      return acc + Math.max(words, 3);
    }, 0);

    let accumulatedTime = 0;
    const synchronizedScenes = scenes.map((scene: any, idx: number) => {
      const words = (scene.narration || '').trim().split(/\s+/).filter(Boolean).length;
      const weight = Math.max(words, 3) / totalWords;
      
      let dur: number;
      if (idx === scenes.length - 1) {
        dur = Math.max(1.0, Math.round((duration - accumulatedTime) * 10) / 10);
      } else {
        dur = Math.max(1.5, Math.round(weight * duration * 10) / 10);
      }
      
      const startTime = Math.round(accumulatedTime * 10) / 10;
      accumulatedTime += dur;
      const endTime = Math.round(accumulatedTime * 10) / 10;

      const oldCaptions = Array.isArray(scene.captions) ? scene.captions : [];
      const captionCount = oldCaptions.length || 1;
      const captionDur = dur / captionCount;
      const newCaptions = oldCaptions.map((cap: any, cIdx: number) => ({
        text: cap.text || '',
        relativeStart: Math.round(cIdx * captionDur * 10) / 10,
        duration: Math.round(captionDur * 10) / 10,
      }));

      return {
        ...scene,
        startTime,
        endTime,
        duration: dur,
        captions: newCaptions.length > 0 ? newCaptions : [
          { text: scene.narration || '', relativeStart: 0, duration: dur }
        ],
      };
    });

    return res.json({ scenes: synchronizedScenes, totalDuration: duration });
  } catch (error: any) {
    console.error('Error synchronizing scene timings:', error);
    return res.status(500).json({ error: 'Failed to synchronize scene timings.' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const host = process.env.HOST || '0.0.0.0';
  app.listen(Number(port), host, () => {
    console.log(`AutoTube Studio server running on http://${host}:${port}`);
  });
}

startServer();
