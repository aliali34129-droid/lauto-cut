import React, { useState, useRef } from 'react';
import { VideoProject } from '../types/editor';
import { AudioEngine } from '../services/audioEngine';
import { exportVideoFile, generateSRTSubtitles } from '../services/videoExporter';
import {
  Download,
  Film,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  audioEngine: AudioEngine;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  audioEngine,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelFlagRef = useRef(false);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setStatusMessage('Initializing video pipeline...');
    setError(null);
    setExportedVideoUrl(null);
    cancelFlagRef.current = false;

    try {
      const blob = await exportVideoFile(
        project,
        audioEngine,
        (pct, msg) => {
          setProgress(pct);
          setStatusMessage(msg);
        },
        () => cancelFlagRef.current
      );

      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
      setProgress(100);
      setStatusMessage('Video exported successfully!');
    } catch (err: any) {
      console.error(err);
      if (!cancelFlagRef.current) {
        setError(err?.message || 'Video export failed.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    cancelFlagRef.current = true;
    setIsExporting(false);
    setStatusMessage('Export cancelled.');
  };

  const handleDownloadVideo = () => {
    if (!exportedVideoUrl) return;
    const a = document.createElement('a');
    a.href = exportedVideoUrl;
    const safeTitle = project.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeTitle}_AutoTube_Export.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSRT = () => {
    const srtContent = generateSRTSubtitles(project);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = project.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeTitle}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadProjectJSON = () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = project.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeTitle}_project.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalDuration =
    project.scenes[project.scenes.length - 1]?.endTime || 10;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Export YouTube Video
              </h3>
              <p className="text-[11px] text-gray-400">
                HD Video with scene transitions, Ken Burns motion, synced audio, and dynamic captions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Export Settings Summary */}
          <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs space-y-2">
            <div className="flex justify-between items-center text-gray-400">
              <span>Resolution & Format</span>
              <span className="font-semibold text-white font-mono">
                {project.aspectRatio === '16:9' ? '1920x1080 (16:9 YouTube Long)' : '1080x1920 (9:16 Shorts)'}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Total Video Duration</span>
              <span className="font-semibold text-white font-mono">
                {totalDuration.toFixed(1)} seconds ({project.scenes.length} Scenes)
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Dynamic AI Captions</span>
              <span className="font-semibold text-yellow-400 uppercase">
                {project.captionStyle.enabled ? project.captionStyle.preset : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Audio Mixing</span>
              <span className="font-semibold text-emerald-400">
                Voiceover + Ducked Background Music
              </span>
            </div>
          </div>

          {/* Render Progress or Trigger */}
          {isExporting ? (
            <div className="p-5 rounded-xl bg-gray-950 border border-gray-800 text-center space-y-3">
              <div className="flex items-center justify-center space-x-2 text-red-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-extrabold text-sm text-white">
                  Rendering Video: {progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className="bg-gradient-to-r from-red-600 to-rose-500 h-full transition-all duration-200"
                />
              </div>

              <p className="text-[11px] text-gray-400 font-mono">
                {statusMessage}
              </p>

              <button
                onClick={handleCancelExport}
                className="text-xs text-red-400 hover:text-red-300 font-medium underline"
              >
                Cancel export
              </button>
            </div>
          ) : exportedVideoUrl ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-bold">
                  Your video is rendered and ready for download!
                </span>
              </div>

              {/* Video Playback Preview */}
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 shadow-lg">
                <video
                  src={exportedVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Main Download Button */}
              <button
                onClick={handleDownloadVideo}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Video File (.webm / .mp4)</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleDownloadSRT}
                  className="p-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Download .SRT Subtitles</span>
                </button>

                <button
                  onClick={handleDownloadProjectJSON}
                  className="p-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export Project JSON</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartExport}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-600/25 transition active:scale-95"
            >
              <Film className="w-4 h-4" />
              <span>Start HD Video Export</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0B0F17] flex justify-end">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
