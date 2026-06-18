'use client';

import type { RefObject } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { AudioPlayerState } from '@/hooks/use-audio-player';

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AudioPlayerProps {
  audioRef: RefObject<HTMLAudioElement>;
  audioUrl: string;
  state: AudioPlayerState;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setSpeed: (rate: number) => void;
  startRafLoop: () => void;
  stopRafLoop: () => void;
  onPlay: () => void;
  onPause: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
  onError: () => void;
}

// ─── AudioPlayer ─────────────────────────────────────────────────────────────

export function AudioPlayer({
  audioRef,
  audioUrl,
  state,
  play,
  pause,
  seek,
  setSpeed,
  onPlay,
  onPause,
  onLoadedMetadata,
  onEnded,
  onError,
}: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, playbackRate } = state;

  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border h-16 flex items-center gap-4 px-4">
      {/* Hidden audio element — only rendered when a source URL exists */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={onPlay}
          onPause={onPause}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onEnded}
          onError={onError}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Play / Pause button — disabled when no audio source */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={isPlaying ? pause : play}
        disabled={!audioUrl}
      >
        {isPlaying ? (
          <Pause className="size-5" aria-hidden="true" />
        ) : (
          <Play className="size-5" aria-hidden="true" />
        )}
      </Button>

      {/* Time display / no-audio notice */}
      {audioUrl ? (
        <span className="text-sm text-muted-foreground tabular-nums w-[84px] shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground italic shrink-0">
          No audio available
        </span>
      )}

      {/* Seek bar */}
      <Slider
        className="flex-1"
        value={[currentTime]}
        min={0}
        max={duration || 1}
        step={0.1}
        onValueChange={([v]) => seek(v ?? 0)}
        aria-label="Audio seek bar"
      />

      {/* Speed toggles */}
      <div
        role="group"
        aria-label="Playback speed"
        className="flex gap-1 shrink-0"
      >
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            aria-pressed={playbackRate === speed}
            onClick={() => setSpeed(speed)}
            className={cn(
              'rounded-full px-3 py-1 h-7 text-sm border border-border transition-colors',
              playbackRate === speed
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-transparent hover:bg-muted',
            )}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
