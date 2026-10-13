import React, { useState } from 'react';
import { VideoProject } from '../types/editor';
import { AudioEngine, TRENDING_MUSIC_TRACKS } from '../services/audioEngine';
import {
  Music,
  Play,
  Pause,
  Upload,
  Volume2,
  Sliders,
  Check,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';

interface MusicSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  audioEngine: AudioEngine;
  onUpdateProject: (updater: (prev: VideoProject) => VideoProject) => void;
}

export const MusicSelectorModal: React.FC<MusicSelectorModalProps> = ({
  isOpen,
  onClose,
  project,
  audioEngine,
  onUpdateProject,
}) => {
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTrack = (trackId: string, synthPreset: any) => {
    audioEngine.setMusicTrackPreset(synthPreset);
    onUpdateProject((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        musicTrackId: trackId,
        musicCustomUrl: null,
      },
    }));
  };

  const handleCustomMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      audioEngine.setCustomMusicSource(url);
      onUpdateProject((prev) => ({
        ...prev,
        audio: {
          ...prev.audio,
          musicCustomUrl: url,
          musicTrackId: 'custom-uploaded-music',
        },
      }));
    }
  };

  const handleTogglePreview = (synthPreset: any, trackId: string) => {
    if (previewingTrackId === trackId) {
      audioEngine.pause();
      setPreviewingTrackId(null);
    } else {
      audioEngine.setMusicTrackPreset(synthPreset);
      audioEngine.play(0);
      setPreviewingTrackId(trackId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121C] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Trending YouTube Background Music & Mixer
              </h3>
              <p className="text-[11px] text-gray-400">
                Royalty-free trending tracks with intelligent speech auto-ducking
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (previewingTrackId) audioEngine.pause();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Audio Ducking & Volume Controls Card */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Smart Voice Auto-Ducking
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Automatically lowers background music by 75% when voiceover speaks
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.audio.autoDucking}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    audioEngine.setAutoDucking(enabled, project.audio.duckingAmount);
                    onUpdateProject((prev) => ({
                      ...prev,
                      audio: { ...prev.audio, autoDucking: enabled },
                    }));
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {/* Music Volume Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-gray-300 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  Background Music Level
                </span>
                <span className="font-mono text-gray-400">
                  {Math.round(project.audio.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={project.audio.musicVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  audioEngine.setMusicVolume(vol);
                  onUpdateProject((prev) => ({
                    ...prev,
                    audio: { ...prev.audio, musicVolume: vol },
                  }));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Curated Trending Tracks Grid */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Curated YouTube Niche Tracks
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TRENDING_MUSIC_TRACKS.map((track) => {
                const isSelected = project.audio.musicTrackId === track.id;
                const isPreviewing = previewingTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrack(track.id, track.synthPreset)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/40'
                        : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">
                          {track.title}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {track.bpm} BPM
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-snug">
                        {track.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800/80">
                      <span className="text-[10px] font-medium text-gray-500">
                        {track.genre}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePreview(track.synthPreset, track.id);
                          }}
                          className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                            isPreviewing
                              ? 'bg-amber-500 text-black'
                              : 'bg-gray-800 text-gray-300 hover:text-white'
                          }`}
                        >
                          {isPreviewing ? (
                            <>
                              <Pause className="w-3 h-3 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-[10px]">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Track Upload */}
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-gray-300">
                Or Upload Custom BGM Track
              </span>
              <p className="text-[11px] text-gray-500">
                Use your own MP3 or WAV audio track
              </p>
            </div>
            <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Choose File</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleCustomMusicUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0B0F17] flex justify-end">
          <button
            onClick={() => {
              if (previewingTrackId) audioEngine.pause();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
