import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoProject, Scene, TimelineCaption } from '../../types/editor';
import { AudioEngine } from '../../services/audioEngine';
import { APP_THEMES } from '../../data/themes';
import { autoMatchImagesToScenes } from '../../services/imageMatcher';
import {
  Scissors,
  Trash2,
  Sparkles,
  Plus,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Mic,
  Music,
  Type,
  Layers,
  Eye,
  EyeOff,
  Edit2,
  Check,
  CheckSquare,
  X,
  Clock,
  Copy,
} from 'lucide-react';

interface CapCutTimelineProps {
  project: VideoProject;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  selectedSceneId: string | null;
  onSelectScene: (scene: Scene) => void;
  selectedCaptionId: string | null;
  onSelectCaption: (captionId: string | null) => void;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
  audioEngine: AudioEngine;
  onAutoSyncScenes: () => void;
  onOpenAiDirector?: () => void;
}

export const CapCutTimeline: React.FC<CapCutTimelineProps> = ({
  project,
  currentTime,
  onTimeUpdate,
  selectedSceneId,
  onSelectScene,
  selectedCaptionId,
  onSelectCaption,
  onUpdateProject,
  audioEngine,
  onAutoSyncScenes,
  onOpenAiDirector,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackAreaRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(38); // Zoom scale
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Drag-to-trim clip state
  const [trimmingSceneId, setTrimmingSceneId] = useState<string | null>(null);
  const [trimSide, setTrimSide] = useState<'left' | 'right' | null>(null);
  const [liveDuration, setLiveDuration] = useState<number | null>(null);
  const trimStartXRef = useRef<number>(0);
  const trimStartDurationRef = useRef<number>(0);

  // Caption Quick Editor Modal State
  const [editingCaption, setEditingCaption] = useState<TimelineCaption | null>(null);

  // Multi-clip selection state (Select All / Batch Edit)
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(
    selectedSceneId ? [selectedSceneId] : []
  );

  // Sync when selectedSceneId changes from external components
  useEffect(() => {
    if (selectedSceneId) {
      setSelectedSceneIds((prev) => {
        // Keep active multi-selection intact while scrubbing or playing
        if (prev.length > 1) {
          return prev;
        }
        if (!prev.includes(selectedSceneId)) {
          return [selectedSceneId];
        }
        return prev;
      });
    }
  }, [selectedSceneId]);

  const isAllClipsSelected =
    project.scenes.length > 0 &&
    selectedSceneIds.length === project.scenes.length;

  const handleToggleSelectAll = () => {
    if (isAllClipsSelected) {
      setSelectedSceneIds([]);
    } else {
      const allIds = project.scenes.map((s) => s.id);
      setSelectedSceneIds(allIds);
      onSelectCaption(null);
      if (project.scenes[0]) {
        onSelectScene(project.scenes[0]);
      }
    }
  };

  const handleSelectAll = () => {
    const allIds = project.scenes.map((s) => s.id);
    setSelectedSceneIds(allIds);
    onSelectCaption(null);
  };

  const handleDeselectAll = () => {
    setSelectedSceneIds([]);
  };

  const [batchCustomDuration, setBatchCustomDuration] = useState('3.5');

  const handleBatchSetDuration = (durationInSeconds: number) => {
    const validDur = Math.max(1.0, Math.min(60, durationInSeconds));
    onUpdateProject((prev) => {
      let accum = 0;
      const updated = prev.scenes.map((s) => {
        const isSelected = selectedSceneIds.includes(s.id);
        const dur = isSelected ? validDur : s.duration;
        const start = Math.round(accum * 10) / 10;
        accum += dur;
        const end = Math.round(accum * 10) / 10;
        return {
          ...s,
          duration: dur,
          startTime: start,
          endTime: end,
        };
      });
      return { ...prev, scenes: updated };
    });
  };

  const handleBatchSetKenBurns = (motion: any) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        selectedSceneIds.includes(s.id) ? { ...s, kenBurns: motion } : s
      ),
    }));
  };

  const handleBatchSetTransition = (transition: any) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        selectedSceneIds.includes(s.id) ? { ...s, transition } : s
      ),
    }));
  };

  const handleBatchDuplicate = () => {
    if (selectedSceneIds.length === 0) return;
    const clipsToDup = project.scenes.filter((s) => selectedSceneIds.includes(s.id));
    if (clipsToDup.length === 0) return;

    onUpdateProject((prev) => {
      let currentEndTime = prev.scenes[prev.scenes.length - 1]?.endTime || 0;
      const duplicatedClips: Scene[] = clipsToDup.map((orig, i) => {
        const newStart = Math.round(currentEndTime * 10) / 10;
        currentEndTime += orig.duration;
        const newEnd = Math.round(currentEndTime * 10) / 10;
        return {
          ...orig,
          id: `scene-${Date.now()}-${i}`,
          sceneNumber: prev.scenes.length + i + 1,
          title: `${orig.title} (Copy)`,
          startTime: newStart,
          endTime: newEnd,
        };
      });

      const newScenes = [...prev.scenes, ...duplicatedClips];
      return { ...prev, scenes: newScenes };
    });
  };

  // Delete active clip(s) or selected caption
  const handleDeleteSelected = () => {
    if (selectedCaptionId) {
      onUpdateProject((prev) => ({
        ...prev,
        timelineCaptions: prev.timelineCaptions.filter((c) => c.id !== selectedCaptionId),
      }));
      onSelectCaption(null);
      return;
    }

    // Batch delete multiple selected clips
    if (selectedSceneIds.length > 1) {
      if (project.scenes.length <= selectedSceneIds.length) {
        // If all scenes are selected and deleted, reset cleanly to 1 fresh starter scene
        const resetScene: Scene = {
          id: `scene-${Date.now()}`,
          sceneNumber: 1,
          title: 'Scene 1',
          narration: 'New scene narration...',
          imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&auto=format&fit=crop&q=80',
          visualPrompt: 'Cinematic landscape, 8k resolution',
          duration: 4.0,
          startTime: 0,
          endTime: 4.0,
          kenBurns: 'zoom-in',
          transition: 'crossfade',
          captions: [{ id: `cap-${Date.now()}`, text: 'New scene', relativeStart: 0, duration: 4.0 }],
        };
        onUpdateProject((prev) => ({ ...prev, scenes: [resetScene] }));
        setSelectedSceneIds([resetScene.id]);
        onSelectScene(resetScene);
        return;
      }

      onUpdateProject((prev) => {
        const filtered = prev.scenes.filter((s) => !selectedSceneIds.includes(s.id));
        let accum = 0;
        const reindexed = filtered.map((s, idx) => {
          const start = Math.round(accum * 10) / 10;
          accum += s.duration;
          const end = Math.round(accum * 10) / 10;
          return {
            ...s,
            sceneNumber: idx + 1,
            startTime: start,
            endTime: end,
          };
        });
        return { ...prev, scenes: reindexed };
      });
      setSelectedSceneIds([]);
      return;
    }

    if (project.scenes.length <= 1) return;
    onUpdateProject((prev) => {
      const filtered = prev.scenes.filter((s) => s.id !== selectedSceneId);
      let accum = 0;
      const reindexed = filtered.map((s, idx) => {
        const start = Math.round(accum * 10) / 10;
        accum += s.duration;
        const end = Math.round(accum * 10) / 10;
        return {
          ...s,
          sceneNumber: idx + 1,
          startTime: start,
          endTime: end,
        };
      });
      return { ...prev, scenes: reindexed };
    });
    if (project.scenes[0]) {
      onSelectScene(project.scenes[0]);
    }
  };

  // Keyboard shortcut: Ctrl+A / Cmd+A to Select All, Esc to Deselect, Delete/Backspace to Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Escape') {
        handleDeselectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSceneIds.length > 0 || selectedCaptionId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.scenes, selectedSceneIds, selectedCaptionId]);

  const handleClipClick = (e: React.MouseEvent, scene: Scene) => {
    onSelectCaption(null);
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle clip in multi-selection
      setSelectedSceneIds((prev) => {
        if (prev.includes(scene.id)) {
          const next = prev.filter((id) => id !== scene.id);
          return next;
        } else {
          return [...prev, scene.id];
        }
      });
      onSelectScene(scene);
    } else {
      setSelectedSceneIds([scene.id]);
      onSelectScene(scene);
    }
  };

  const totalDuration = project.scenes[project.scenes.length - 1]?.endTime || 10;
  const totalTimelineWidth = Math.max(900, totalDuration * pixelsPerSecond + 200);

  // Silky-Smooth 60 FPS Playhead Movement:
  // Listens to high-frequency microsecond event from CapCutMonitor without triggering heavy React re-renders!
  useEffect(() => {
    const handleSmoothTime = (e: any) => {
      if (isDraggingPlayhead) return;
      const t = e.detail?.time ?? 0;
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${t * pixelsPerSecond}px)`;
      }
    };

    window.addEventListener('editor:smooth-time', handleSmoothTime);
    return () => window.removeEventListener('editor:smooth-time', handleSmoothTime);
  }, [pixelsPerSecond, isDraggingPlayhead]);

  // Sync playhead needle position when scrubbed or paused
  useEffect(() => {
    if (playheadRef.current) {
      playheadRef.current.style.transform = `translateX(${currentTime * pixelsPerSecond}px)`;
    }
  }, [currentTime, pixelsPerSecond]);

  // Scrubber scrubbing logic
  const handleScrub = useCallback(
    (clientX: number) => {
      if (!trackAreaRef.current) return;
      const rect = trackAreaRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const newTime = Math.max(0, Math.min(totalDuration, clickX / pixelsPerSecond));
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${newTime * pixelsPerSecond}px)`;
      }
      onTimeUpdate(newTime);
    },
    [pixelsPerSecond, totalDuration, onTimeUpdate]
  );

  const handleMouseDownScrubber = (e: React.MouseEvent) => {
    setIsDraggingPlayhead(true);
    handleScrub(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) handleScrub(e.clientX);
    };
    const handleMouseUp = () => {
      if (isDraggingPlayhead) setIsDraggingPlayhead(false);
    };
    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, handleScrub]);

  // CapCut Signature Tool: 100% Reliable Split Clip at Playhead
  const handleSplitAtPlayhead = () => {
    // 1. First prioritize selected clip if playhead is within or close to it
    let sceneIdx = -1;
    if (selectedSceneId) {
      sceneIdx = project.scenes.findIndex((s) => s.id === selectedSceneId);
    }

    // 2. If no selected clip or playhead outside selected clip, find the clip directly under the playhead
    if (
      sceneIdx === -1 ||
      currentTime < project.scenes[sceneIdx].startTime ||
      currentTime > project.scenes[sceneIdx].endTime
    ) {
      sceneIdx = project.scenes.findIndex(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime
      );
    }

    // 3. Fallback to closest clip if playhead is near boundary
    if (sceneIdx === -1) {
      sceneIdx = project.scenes.findIndex(
        (s) => Math.abs(currentTime - (s.startTime + s.duration / 2)) <= s.duration
      );
    }

    if (sceneIdx === -1 && project.scenes.length > 0) {
      sceneIdx = 0;
    }

    if (sceneIdx === -1) return;

    audioEngine.playSFX('whoosh');

    onUpdateProject((prev) => {
      const target = prev.scenes[sceneIdx];
      // Bound split position with a minimum 0.2s duration for each piece
      const splitTime = Math.max(
        target.startTime + 0.2,
        Math.min(target.endTime - 0.2, currentTime)
      );

      const firstDuration = Math.max(
        0.3,
        Math.round((splitTime - target.startTime) * 10) / 10
      );
      const secondDuration = Math.max(
        0.3,
        Math.round((target.endTime - splitTime) * 10) / 10
      );

      // Split narration sentences if multiple words exist
      const words = (target.narration || '').split(' ');
      const midPoint = Math.max(1, Math.floor(words.length / 2));
      const firstNarration = words.slice(0, midPoint).join(' ') || target.narration;
      const secondNarration = words.slice(midPoint).join(' ') || target.narration;

      const firstScene: Scene = {
        ...target,
        duration: firstDuration,
        endTime: splitTime,
        narration: firstNarration,
      };

      const secondScene: Scene = {
        ...target,
        id: `scene-${Date.now()}`,
        sceneNumber: target.sceneNumber + 1,
        title: `${target.title} (Part 2)`,
        narration: secondNarration,
        startTime: splitTime,
        endTime: target.endTime,
        duration: secondDuration,
      };

      const updated = [...prev.scenes];
      updated.splice(sceneIdx, 1, firstScene, secondScene);

      // Recalculate timing seamlessly
      let accum = 0;
      const reindexed = updated.map((s, idx) => {
        const start = Math.round(accum * 10) / 10;
        accum += s.duration;
        const end = Math.round(accum * 10) / 10;
        return {
          ...s,
          sceneNumber: idx + 1,
          startTime: start,
          endTime: end,
        };
      });

      // Select newly created second clip
      setTimeout(() => onSelectScene(secondScene), 20);

      return { ...prev, scenes: reindexed };
    });
  };

  // Add new scene clip
  const handleAddScene = () => {
    const last = project.scenes[project.scenes.length - 1];
    const start = last ? last.endTime : 0;
    const dur = 4.0;
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      sceneNumber: project.scenes.length + 1,
      title: `Scene ${project.scenes.length + 1}`,
      narration: 'Add narration sentence for this new visual moment...',
      startTime: start,
      endTime: start + dur,
      duration: dur,
      imageUrl:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      kenBurns: 'zoom-in',
      transition: 'crossfade',
      visualEffect: 'cinematic',
      captions: [
        { id: `c-${Date.now()}`, text: 'KEY TAKEAWAY', relativeStart: 0, duration: dur },
      ],
    };

    onUpdateProject((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    onSelectScene(newScene);
  };

  // Add new caption beat at current playhead
  const handleAddCaptionAtPlayhead = () => {
    const newCap: TimelineCaption = {
      id: `tc-${Date.now()}`,
      text: 'NEW CAPTION BEAT',
      startTime: Math.round(currentTime * 10) / 10,
      endTime: Math.round((currentTime + 1.8) * 10) / 10,
      duration: 1.8,
    };

    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: [...prev.timelineCaptions, newCap].sort(
        (a, b) => a.startTime - b.startTime
      ),
      captionStyle: { ...prev.captionStyle, enabled: true },
    }));
    onSelectCaption(newCap.id);
    setEditingCaption(newCap);
  };

  // Clear all captions
  const handleClearAllCaptions = () => {
    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: [],
    }));
    onSelectCaption(null);
  };

  // Auto-Generate Captions from Narration
  const handleAutoGenerateCaptions = () => {
    onUpdateProject((prev) => {
      const generated: TimelineCaption[] = [];
      let globalCounter = 1;

      prev.scenes.forEach((scene) => {
        const words = (scene.narration || '').trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return;

        const chunkSize = 3; // Punchy 3-word chunks (CapCut Viral Style)
        const totalChunks = Math.ceil(words.length / chunkSize);
        const chunkDuration = scene.duration / Math.max(1, totalChunks);

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunkWords = words.slice(i, i + chunkSize).join(' ');
          const chunkIdx = Math.floor(i / chunkSize);
          const start = Math.round((scene.startTime + chunkIdx * chunkDuration) * 10) / 10;
          const end = Math.round((start + chunkDuration) * 10) / 10;

          generated.push({
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
        timelineCaptions: generated,
        captionStyle: { ...prev.captionStyle, enabled: true },
      };
    });
  };

  // Save edited caption
  const handleSaveCaptionEdit = () => {
    if (!editingCaption) return;
    onUpdateProject((prev) => ({
      ...prev,
      timelineCaptions: prev.timelineCaptions.map((c) =>
        c.id === editingCaption.id ? editingCaption : c
      ),
    }));
    setEditingCaption(null);
  };

  // Clip Edge Drag-to-Trim Handlers
  const handleStartTrim = (
    e: React.MouseEvent,
    sceneId: string,
    side: 'left' | 'right',
    currentDur: number
  ) => {
    e.stopPropagation();
    setTrimmingSceneId(sceneId);
    setTrimSide(side);
    setLiveDuration(currentDur);
    trimStartXRef.current = e.clientX;
    trimStartDurationRef.current = currentDur;
  };

  useEffect(() => {
    const handleMouseMoveTrim = (e: MouseEvent) => {
      if (!trimmingSceneId) return;
      const deltaPx = e.clientX - trimStartXRef.current;
      const deltaSec = deltaPx / pixelsPerSecond;

      let newDur: number;
      if (trimSide === 'right') {
        newDur = Math.max(0.6, Math.round((trimStartDurationRef.current + deltaSec) * 10) / 10);
      } else {
        newDur = Math.max(0.6, Math.round((trimStartDurationRef.current - deltaSec) * 10) / 10);
      }

      setLiveDuration(newDur);
    };

    const handleMouseUpTrim = () => {
      if (!trimmingSceneId || liveDuration === null) {
        setTrimmingSceneId(null);
        setTrimSide(null);
        setLiveDuration(null);
        return;
      }

      const finalDuration = liveDuration;
      onUpdateProject((prev) => {
        const idx = prev.scenes.findIndex((s) => s.id === trimmingSceneId);
        if (idx === -1) return prev;

        const updated = [...prev.scenes];
        updated[idx] = { ...updated[idx], duration: finalDuration };

        let accum = 0;
        const recalculated = updated.map((s) => {
          const start = Math.round(accum * 10) / 10;
          accum += s.duration;
          const end = Math.round(accum * 10) / 10;
          return { ...s, startTime: start, endTime: end };
        });

        return { ...prev, scenes: recalculated };
      });

      setTrimmingSceneId(null);
      setTrimSide(null);
      setLiveDuration(null);
    };

    if (trimmingSceneId) {
      window.addEventListener('mousemove', handleMouseMoveTrim);
      window.addEventListener('mouseup', handleMouseUpTrim);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveTrim);
      window.removeEventListener('mouseup', handleMouseUpTrim);
    };
  }, [trimmingSceneId, trimSide, liveDuration, pixelsPerSecond, onUpdateProject]);

  // Format seconds to MM:SS:ff
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms
      .toString()
      .padStart(2, '0')}`;
  };

  // Generate ruler tick marks
  const rulerTicks: number[] = [];
  for (let s = 0; s <= Math.ceil(totalDuration) + 4; s += 2) {
    rulerTicks.push(s);
  }

  const currentTheme = APP_THEMES[project.theme] || APP_THEMES.obsidian;

  return (
    <div className={`h-68 ${currentTheme.bgCard} border-t ${currentTheme.border} flex flex-col select-none shrink-0 relative transition-colors duration-200`}>
      {/* 1. CapCut Pro Toolbar Header */}
      <div className={`h-9 px-4 ${currentTheme.bgHeader} border-b ${currentTheme.border} flex items-center justify-between text-xs z-10 shrink-0`}>
        {/* Left: Quick Actions */}
        <div className="flex items-center space-x-2">
          {/* Split at Playhead (Scissors) */}
          <button
            onClick={handleSplitAtPlayhead}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1C1F2B] hover:bg-cyan-950/40 text-cyan-400 hover:text-cyan-300 transition font-bold border border-cyan-500/40 text-[11px] shadow-sm active:scale-95"
            title="Split clip at red playhead (Scissors tool)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split Clip</span>
          </button>

          {/* Delete Clip or Caption */}
          <button
            onClick={handleDeleteSelected}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1C1F2B] hover:bg-red-950/40 text-gray-300 hover:text-red-400 transition font-medium border border-gray-700/60 text-[11px]"
            title={selectedCaptionId ? 'Delete selected caption' : selectedSceneIds.length > 1 ? `Delete all ${selectedSceneIds.length} selected clips` : 'Delete selected video clip'}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>
              {selectedCaptionId
                ? 'Delete Caption'
                : selectedSceneIds.length > 1
                ? `Delete (${selectedSceneIds.length})`
                : 'Delete Clip'}
            </span>
          </button>

          {/* Select All Clips Button */}
          <button
            onClick={handleToggleSelectAll}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition text-[11px] font-bold border shadow-sm ${
              isAllClipsSelected
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60 ring-1 ring-cyan-400/30'
                : selectedSceneIds.length > 0
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-700/60'
                : 'bg-[#1C1F2B] hover:bg-[#25293A] text-gray-300 hover:text-white border-gray-700/60'
            }`}
            title="Select all images and clips on the timeline (Shortcut: Ctrl+A / Cmd+A)"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isAllClipsSelected
                ? `All Selected (${project.scenes.length})`
                : selectedSceneIds.length > 1
                ? `${selectedSceneIds.length} Selected`
                : 'Select All'}
            </span>
          </button>

          <div className="h-4 w-px bg-gray-800 mx-1" />

          {/* Auto-Sync Timing & Audio Button */}
          <button
            onClick={onOpenAiDirector || onAutoSyncScenes}
            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 text-cyan-300 border border-cyan-500/40 transition text-[11px] font-bold shadow-sm"
            title="Auto-align visual image durations to voiceover and script with Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Auto-Sync Voice</span>
          </button>

          {/* 1-Click Auto-Match Images to Voiceover Narration */}
          <button
            onClick={() => {
              onUpdateProject((prev) => ({
                ...prev,
                scenes: autoMatchImagesToScenes(prev.scenes),
              }));
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1C1F2B] hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 transition text-[11px] font-bold shadow-sm"
            title="Auto-match relevant images for every scene based on voiceover narration"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync Images to Voice</span>
          </button>

          {/* Add Clip */}
          <button
            onClick={handleAddScene}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1C1F2B] hover:bg-[#25293A] text-gray-200 hover:text-white transition font-medium border border-gray-700/60 text-[11px]"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Clip</span>
          </button>

          {/* Add Caption */}
          <button
            onClick={handleAddCaptionAtPlayhead}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1C1F2B] hover:bg-[#25293A] text-yellow-300 hover:text-white transition font-medium border border-gray-700/60 text-[11px]"
            title="Add a new caption chunk at current playhead"
          >
            <Type className="w-3.5 h-3.5 text-yellow-400" />
            <span>+ Caption</span>
          </button>
        </div>

        {/* Right: Timecode & Zoom */}
        <div className="flex items-center space-x-3 text-gray-400">
          <span className="font-mono text-cyan-400 text-xs font-bold bg-black/60 px-2 py-0.5 rounded border border-gray-800">
            {formatTimecode(currentTime)}
          </span>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-gray-950 rounded px-1.5 py-0.5 border border-gray-800">
            <button
              onClick={() => setPixelsPerSecond((p) => Math.max(16, p - 6))}
              className="p-0.5 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1">
              {Math.round((pixelsPerSecond / 38) * 100)}%
            </span>
            <button
              onClick={() => setPixelsPerSecond((p) => Math.min(110, p + 6))}
              className="p-0.5 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 Floating Batch Action Bar when multiple/all clips are selected */}
      {selectedSceneIds.length > 1 && (
        <div className="h-8 bg-gradient-to-r from-cyan-950/95 via-[#121624] to-cyan-950/95 border-b border-cyan-500/50 px-3 flex items-center justify-between text-xs z-20 shrink-0 shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px] shrink-0">
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {isAllClipsSelected
                  ? `All ${project.scenes.length} Clips Selected`
                  : `${selectedSceneIds.length} Clips Selected`}
              </span>
            </span>

            <div className="h-3.5 w-px bg-cyan-700/50 shrink-0" />

            {/* Quick Batch Duration Buttons + Custom Input */}
            <div className="flex items-center space-x-1 shrink-0">
              <span className="text-[10px] text-gray-400">Duration:</span>
              {[2.0, 3.0, 4.0, 5.0].map((dur) => (
                <button
                  key={dur}
                  onClick={() => handleBatchSetDuration(dur)}
                  className="px-1.5 py-0.5 rounded bg-[#1C2030] hover:bg-cyan-600 hover:text-white text-gray-200 border border-cyan-700/40 text-[10px] font-mono font-bold transition"
                  title={`Set all selected clips to ${dur}s`}
                >
                  {dur}s
                </button>
              ))}
              <div className="flex items-center space-x-1 ml-0.5">
                <input
                  type="number"
                  min="0.5"
                  max="60"
                  step="0.5"
                  value={batchCustomDuration}
                  onChange={(e) => setBatchCustomDuration(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBatchSetDuration(parseFloat(batchCustomDuration) || 3.5);
                    }
                  }}
                  className="w-11 bg-black/70 text-cyan-300 border border-cyan-700/60 rounded px-1 py-0.2 text-[10px] font-mono text-center focus:outline-none focus:border-cyan-400"
                  title="Type custom duration and click Set"
                />
                <button
                  onClick={() => handleBatchSetDuration(parseFloat(batchCustomDuration) || 3.5)}
                  className="px-1.5 py-0.5 rounded bg-cyan-700/70 hover:bg-cyan-600 text-white text-[10px] font-bold transition"
                  title="Apply custom duration"
                >
                  Set
                </button>
              </div>
            </div>

            <div className="h-3.5 w-px bg-cyan-700/50 hidden md:block shrink-0" />

            {/* Quick Batch Camera Motion */}
            <div className="hidden lg:flex items-center space-x-1 shrink-0">
              <span className="text-[10px] text-gray-400">Motion:</span>
              {(['zoom-in', 'zoom-out', 'pan-right', 'float'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleBatchSetKenBurns(m)}
                  className="px-1.5 py-0.5 rounded bg-[#1C2030] hover:bg-cyan-600 hover:text-white text-gray-200 border border-cyan-700/40 text-[9px] uppercase font-bold transition"
                  title={`Apply ${m} to all selected clips`}
                >
                  {m.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="h-3.5 w-px bg-cyan-700/50 hidden md:block shrink-0" />

            {/* Batch Duplicate */}
            <button
              onClick={handleBatchDuplicate}
              className="px-2 py-0.5 rounded bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 text-[10px] font-bold flex items-center gap-1 transition shrink-0"
              title="Duplicate all selected clips"
            >
              <Copy className="w-3 h-3 text-indigo-400" />
              <span>Duplicate</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 shrink-0 ml-2">
            {/* Batch Delete */}
            <button
              onClick={handleDeleteSelected}
              className="px-2 py-0.5 rounded bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-700/50 text-[10px] font-bold flex items-center gap-1 transition"
              title="Delete all selected clips (Delete/Backspace)"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>Delete ({selectedSceneIds.length})</span>
            </button>

            {/* Deselect */}
            <button
              onClick={handleDeselectAll}
              className="px-1.5 py-0.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white text-[10px] font-bold flex items-center gap-0.5 transition"
              title="Deselect All (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Magnetic Multi-Track Scroll Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#090B10]"
      >
        <div
          ref={trackAreaRef}
          style={{ width: `${totalTimelineWidth}px` }}
          className="h-full relative flex flex-col"
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (
              target === trackAreaRef.current ||
              target.dataset.trackBg === 'true' ||
              target.classList.contains('track-row')
            ) {
              handleMouseDownScrubber(e);
            }
          }}
        >
          {/* Time Ruler */}
          <div
            onMouseDown={handleMouseDownScrubber}
            className="h-6 bg-[#11131A] border-b border-gray-800/80 relative cursor-pointer shrink-0"
          >
            {rulerTicks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * pixelsPerSecond}px` }}
                className="absolute top-0 bottom-0 flex flex-col items-start border-l border-gray-800 text-[9px] font-mono text-gray-500 pl-1 pointer-events-none"
              >
                <span>{sec}s</span>
              </div>
            ))}
          </div>

          {/* TRACK 1: Text / Captions Layer */}
          <div className="h-9 bg-[#0D0F16] border-b border-gray-800/60 relative flex items-center px-1 shrink-0">
            {/* Track Tag with Captions On/Off & Auto-Generate & Clear */}
            <div className="absolute left-1 top-1 bottom-1 text-[8px] font-bold text-yellow-400 bg-black/90 px-2 rounded z-20 flex items-center gap-1.5 border border-yellow-500/20">
              <Type className="w-3 h-3 text-yellow-400" />
              <span>CAPTIONS</span>

              <button
                onClick={() =>
                  onUpdateProject((prev) => ({
                    ...prev,
                    captionStyle: { ...prev.captionStyle, enabled: !prev.captionStyle.enabled },
                  }))
                }
                className="ml-1 p-0.5 hover:text-white rounded"
                title={
                  project.captionStyle.enabled
                    ? 'Captions Visible (Click to Hide)'
                    : 'Captions Hidden (Click to Show)'
                }
              >
                {project.captionStyle.enabled ? (
                  <Eye className="w-3 h-3 text-yellow-400" />
                ) : (
                  <EyeOff className="w-3 h-3 text-gray-500" />
                )}
              </button>

              <button
                onClick={handleAutoGenerateCaptions}
                className="p-0.5 hover:text-cyan-300 rounded"
                title="Auto-generate sync captions from narration (CapCut Style)"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </button>

              {project.timelineCaptions.length > 0 && (
                <button
                  onClick={handleClearAllCaptions}
                  className="p-0.5 hover:text-red-400 rounded"
                  title="Remove all captions"
                >
                  <Trash2 className="w-2.5 h-2.5 text-gray-500 hover:text-red-400" />
                </button>
              )}
            </div>

            {project.timelineCaptions.map((cap) => {
              const capLeft = cap.startTime * pixelsPerSecond;
              const capWidth = Math.max(30, cap.duration * pixelsPerSecond - 2);
              const isSelected = selectedCaptionId === cap.id;

              return (
                <div
                  key={cap.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCaption(cap.id);
                    onTimeUpdate(cap.startTime);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingCaption(cap);
                  }}
                  style={{ left: `${capLeft}px`, width: `${capWidth}px` }}
                  className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center justify-between overflow-hidden cursor-pointer transition select-none shadow-sm ${
                    isSelected
                      ? 'bg-yellow-400 text-black border-2 border-white ring-2 ring-yellow-400/60 font-black'
                      : 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/35 font-bold'
                  }`}
                  title={`${cap.text} (${cap.startTime.toFixed(1)}s - ${cap.endTime.toFixed(
                    1
                  )}s) - Double-click to edit`}
                >
                  <span className="text-[9px] truncate font-['Cabinet_Grotesk']">
                    {cap.text}
                  </span>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCaption(cap);
                      }}
                      className="p-0.5 bg-black/40 hover:bg-black rounded text-white ml-1 shrink-0"
                      title="Edit Caption Text"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* TRACK 2: Main Video / Visuals Clips Filmstrip with Drag-to-Trim Handles */}
          <div className="h-24 bg-[#0A0C12] border-b border-gray-800/70 relative flex items-center px-1 shrink-0">
            <div className="absolute left-1 top-1 z-20 flex items-center gap-1.5">
              <div className="text-[8px] font-bold text-cyan-400 bg-black/90 px-1.5 py-0.5 rounded flex items-center gap-1 border border-cyan-500/20 shadow pointer-events-none">
                <ImageIcon className="w-2.5 h-2.5" />
                <span>VIDEO ({project.scenes.length})</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSelectAll();
                }}
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded transition flex items-center gap-1 border shadow cursor-pointer ${
                  isAllClipsSelected
                    ? 'bg-cyan-500 text-black border-cyan-400 font-black'
                    : selectedSceneIds.length > 0
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70'
                    : 'bg-black/80 hover:bg-[#1C2030] text-gray-300 hover:text-white border-gray-700/80'
                }`}
                title={isAllClipsSelected ? 'Deselect all clips (Esc)' : 'Select all clips together (Ctrl+A)'}
              >
                <CheckSquare className="w-2.5 h-2.5" />
                <span>{isAllClipsSelected ? 'All Selected' : 'Select All'}</span>
              </button>
            </div>

            {project.scenes.map((scene) => {
              const isSelected = selectedSceneIds.includes(scene.id);
              const isTrimmingThis = trimmingSceneId === scene.id;
              const currentDur = isTrimmingThis && liveDuration !== null ? liveDuration : scene.duration;
              const sceneWidth = currentDur * pixelsPerSecond;
              const sceneLeft = scene.startTime * pixelsPerSecond;

              return (
                <div
                  key={scene.id}
                  onClick={(e) => handleClipClick(e, scene)}
                  style={{
                    left: `${sceneLeft}px`,
                    width: `${Math.max(48, sceneWidth - 2)}px`,
                  }}
                  className={`absolute top-1 bottom-1 rounded-xl border cursor-pointer transition-all flex overflow-hidden group select-none shadow-md ${
                    isSelected
                      ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-[#162030]'
                      : 'border-gray-700/80 bg-[#14161F] hover:border-gray-500'
                  }`}
                >
                  {/* Left Trim Handle (Drag to adjust clip duration from start) */}
                  <div
                    onMouseDown={(e) => handleStartTrim(e, scene.id, 'left', scene.duration)}
                    className="w-2 bg-transparent hover:bg-cyan-400 cursor-ew-resize shrink-0 z-10 transition opacity-0 group-hover:opacity-100"
                    title="Drag to trim duration from left"
                  />

                  {/* Clip Thumbnail */}
                  <div className="w-16 h-full relative bg-black shrink-0 overflow-hidden border-r border-gray-800">
                    <img
                      src={scene.imageUrl}
                      alt={scene.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-center text-white py-0.2 font-bold">
                      S{scene.sceneNumber}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 left-1 z-10 w-4 h-4 rounded bg-cyan-400 text-black flex items-center justify-center shadow-md">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Clip Metadata */}
                  <div className="flex-1 p-1.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-white truncate">{scene.title}</span>
                      <span className="font-mono text-[9px] text-cyan-400 bg-black/70 px-1 rounded font-bold">
                        {currentDur.toFixed(1)}s
                      </span>
                    </div>

                    <p className="text-[9px] text-gray-400 truncate mt-0.5">
                      {scene.narration}
                    </p>

                    <div className="flex items-center justify-between text-[8px] text-gray-500 font-mono pt-1">
                      <span className="uppercase">{scene.kenBurns}</span>
                      <span className="uppercase text-cyan-300">{scene.transition}</span>
                    </div>
                  </div>

                  {/* CapCut Transition Handle Glyph between clips */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      audioEngine.playSFX('whoosh');
                    }}
                    className="w-3 bg-black/50 hover:bg-cyan-500 hover:text-black border-l border-gray-800 flex items-center justify-center transition cursor-pointer"
                    title={`Transition: ${scene.transition}`}
                  >
                    <Layers className="w-2.5 h-2.5 opacity-60" />
                  </div>

                  {/* Right Trim Handle (Drag to adjust clip duration smoothly) */}
                  <div
                    onMouseDown={(e) => handleStartTrim(e, scene.id, 'right', scene.duration)}
                    className="w-2.5 bg-cyan-500/10 hover:bg-cyan-400 cursor-ew-resize shrink-0 z-10 transition opacity-30 group-hover:opacity-100 flex items-center justify-center"
                    title="Drag to increase or decrease clip duration"
                  >
                    <div className="w-0.5 h-5 bg-white/60 rounded" />
                  </div>

                  {/* Live Trim Tooltip */}
                  {isTrimmingThis && (
                    <div className="absolute top-1 right-3 bg-cyan-500 text-black px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg pointer-events-none z-30">
                      Duration: {currentDur.toFixed(1)}s
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* TRACK 3: Voiceover Audio Strip */}
          <div className="h-11 bg-[#0A0713] border-b border-gray-800/60 relative flex items-center px-1 shrink-0">
            <div className="absolute left-1 top-1 text-[8px] font-bold text-purple-400 bg-black/90 px-1.5 py-0.5 rounded z-20 pointer-events-none flex items-center gap-1 border border-purple-500/20">
              <Mic className="w-2.5 h-2.5" />
              <span>VOICE</span>
            </div>

            {/* Simulated waveform bars */}
            <div
              style={{ width: `${totalDuration * pixelsPerSecond}px` }}
              className="h-6 bg-purple-950/25 border border-purple-800/40 rounded-lg relative flex items-center px-1 overflow-hidden"
            >
              <div className="w-full h-full flex items-center space-x-[2px] opacity-75">
                {Array.from({
                  length: Math.max(10, Math.floor((totalDuration * pixelsPerSecond) / 4)),
                }).map((_, barIdx) => {
                  const heightPct = 25 + Math.sin(barIdx * 0.4) * 35 + ((barIdx * 7) % 35);
                  return (
                    <div
                      key={barIdx}
                      style={{ height: `${Math.min(95, heightPct)}%` }}
                      className="w-[2px] bg-purple-400 rounded-full"
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* TRACK 4: Background Music Track */}
          <div className="h-9 bg-[#0E0C06] relative flex items-center px-1 shrink-0">
            <div className="absolute left-1 top-1 text-[8px] font-bold text-amber-400 bg-black/90 px-1.5 py-0.5 rounded z-20 pointer-events-none flex items-center gap-1 border border-amber-500/20">
              <Music className="w-2.5 h-2.5" />
              <span>BGM</span>
            </div>

            <div
              style={{ width: `${totalDuration * pixelsPerSecond}px` }}
              className="h-5 bg-amber-950/20 border border-amber-800/30 rounded relative flex items-center px-1"
            >
              <div className="w-full flex items-center space-x-1 opacity-70">
                {Array.from({
                  length: Math.max(5, Math.floor((totalDuration * pixelsPerSecond) / 10)),
                }).map((_, mIdx) => (
                  <div key={mIdx} className="h-2 w-2 rounded-full bg-amber-500/70" />
                ))}
              </div>
            </div>
          </div>

          {/* Red CapCut Playhead Needle (Silky-smooth 60 FPS GPU-accelerated translate) */}
          <div
            ref={playheadRef}
            style={{
              transform: `translateX(${currentTime * pixelsPerSecond}px)`,
              willChange: 'transform',
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_12px_rgba(239,68,68,1)]"
          >
            {/* Grab hit-target along entire needle height */}
            <div
              onMouseDown={handleMouseDownScrubber}
              className="absolute top-0 bottom-0 -left-2 w-4 cursor-ew-resize pointer-events-auto"
              title="Click & drag playhead line"
            />
            {/* Playhead Top Needle Handle */}
            <div
              onMouseDown={handleMouseDownScrubber}
              className="w-4 h-4 -ml-[7px] -mt-[2px] bg-red-600 rounded-xs transform rotate-45 border-2 border-white shadow-xl pointer-events-auto cursor-ew-resize hover:scale-125 active:scale-95 transition-transform"
              title="Drag playhead needle"
            />
          </div>
        </div>
      </div>

      {/* Caption Quick Editor Popover Modal */}
      {editingCaption && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14161F] border border-yellow-500/40 rounded-xl p-4 w-96 max-w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-yellow-400" />
                <span>Edit Caption Beat</span>
              </span>
              <button
                onClick={() => setEditingCaption(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                Subtitle Text
              </label>
              <input
                type="text"
                value={editingCaption.text}
                onChange={(e) =>
                  setEditingCaption({ ...editingCaption, text: e.target.value })
                }
                className="w-full bg-[#0D0F16] border border-gray-700 rounded-lg p-2 text-xs text-white font-bold focus:outline-none focus:border-yellow-400"
                placeholder="Enter subtitle phrase..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">
                  Start (seconds)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingCaption.startTime}
                  onChange={(e) => {
                    const st = parseFloat(e.target.value) || 0;
                    setEditingCaption({
                      ...editingCaption,
                      startTime: st,
                      endTime: Math.round((st + editingCaption.duration) * 10) / 10,
                    });
                  }}
                  className="w-full bg-[#0D0F16] border border-gray-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.3"
                  value={editingCaption.duration}
                  onChange={(e) => {
                    const dur = parseFloat(e.target.value) || 0.5;
                    setEditingCaption({
                      ...editingCaption,
                      duration: dur,
                      endTime: Math.round((editingCaption.startTime + dur) * 10) / 10,
                    });
                  }}
                  className="w-full bg-[#0D0F16] border border-gray-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <button
                onClick={() => {
                  onUpdateProject((prev) => ({
                    ...prev,
                    timelineCaptions: prev.timelineCaptions.filter(
                      (c) => c.id !== editingCaption.id
                    ),
                  }));
                  setEditingCaption(null);
                  onSelectCaption(null);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 text-xs font-bold transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCaption(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCaptionEdit}
                  className="px-3.5 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
