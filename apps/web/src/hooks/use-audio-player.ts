'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WordTimestamp } from '@repo/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AudioPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  hasListenedEnough: boolean;
}

// ─── findActiveWordIndex (exported pure function) ─────────────────────────────
// Binary search: returns the index of the word that is currently playing.
// Boundary rule: words[i].start <= currentTime < words[i].end
// Returns -1 when between words or currentTime is at exact .end boundary.

export function findActiveWordIndex(
  words: WordTimestamp[],
  currentTime: number,
): number {
  if (words.length === 0) return -1;

  let lo = 0;
  let hi = words.length - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const word = words[mid];
    if (!word) return -1;

    if (word.start <= currentTime && currentTime < word.end) {
      return mid;
    } else if (word.end <= currentTime) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return -1;
}

// ─── useAudioPlayer hook ───────────────────────────────────────────────────────

export function useAudioPlayer(audioUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [state, setState] = useState<AudioPlayerState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: 1,
    // No audio source → bypass the listen-first gate immediately
    hasListenedEnough: !audioUrl,
  });

  // ─── rAF tick ──────────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    if (!audioRef.current) return;

    const currentTime = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 0;
    const hasListenedEnough = duration > 0 && currentTime >= duration * 0.5;

    setState((prev) => {
      // Only update hasListenedEnough — never set back to false
      const nextHasListenedEnough = prev.hasListenedEnough || hasListenedEnough;

      if (
        prev.currentTime === currentTime &&
        prev.hasListenedEnough === nextHasListenedEnough
      ) {
        return prev; // no change — avoid re-render
      }

      return {
        ...prev,
        currentTime,
        hasListenedEnough: nextHasListenedEnough,
      };
    });

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ─── Loop controls ──────────────────────────────────────────────────────────

  const startRafLoop = useCallback(() => {
    if (rafRef.current !== null) return; // already running
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopRafLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopRafLoop();
    };
  }, [stopRafLoop]);

  // ─── Playback controls ──────────────────────────────────────────────────────

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {
      // Audio unavailable (no source, network error, unsupported format)
      // Auto-grant the listen-first gate so exercises remain accessible
      setState((prev) => ({ ...prev, hasListenedEnough: true }));
    });
    // startRafLoop is also triggered by the onPlay audio event in AudioPlayer
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    // stopRafLoop is also triggered by the onPause audio event in AudioPlayer
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
  }, []);

  const setSpeed = useCallback((rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  // ─── Audio event handlers (called from AudioPlayer component) ───────────────

  const onPlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
    startRafLoop();
  }, [startRafLoop]);

  const onPause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    stopRafLoop();
  }, [stopRafLoop]);

  const onLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setState((prev) => ({
      ...prev,
      duration: audioRef.current!.duration || 0,
    }));
  }, []);

  const onEnded = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    stopRafLoop();
  }, [stopRafLoop]);

  return {
    audioRef,
    audioUrl,
    state,
    play,
    pause,
    seek,
    setSpeed,
    startRafLoop,
    stopRafLoop,
    onPlay,
    onPause,
    onLoadedMetadata,
    onEnded,
  };
}
