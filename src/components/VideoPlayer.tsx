"use client";

import { useEffect, useRef, useCallback } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";
import type { SyncState } from "@/lib/types";

interface Props {
  playbackId: string | null;
  syncState: SyncState | null;
  onTimeUpdate?: (time: number) => void;
}

export default function VideoPlayer({ playbackId, syncState, onTimeUpdate }: Props) {
  const playerRef = useRef<MuxPlayerElement>(null);
  const lastSyncRef = useRef<number>(0);

  // Apply sync state from server
  const applySync = useCallback((sync: SyncState) => {
    const player = playerRef.current;
    if (!player || !player.duration) return;

    // Calculate where the video should be right now
    const elapsed = (Date.now() - sync.updated_at) / 1000;
    const targetTime = sync.state === "playing"
      ? sync.timestamp + elapsed * sync.rate
      : sync.timestamp;

    const drift = Math.abs(player.currentTime - targetTime);

    if (drift > 3) {
      // Hard seek — drift too large
      player.currentTime = targetTime;
    } else if (drift > 0.5) {
      // Gentle rate adjustment to drift back
      player.playbackRate = player.currentTime < targetTime ? 1.02 : 0.98;
      // Reset rate after 2 seconds
      setTimeout(() => {
        if (playerRef.current) playerRef.current.playbackRate = sync.rate;
      }, 2000);
    }

    // Play/pause state
    if (sync.state === "playing" && player.paused) {
      player.play().catch(() => {});
    } else if (sync.state === "paused" && !player.paused) {
      player.pause();
    }
  }, []);

  useEffect(() => {
    if (!syncState) return;
    // Only apply if this is a newer sync than what we've already processed
    if (syncState.updated_at <= lastSyncRef.current) return;
    lastSyncRef.current = syncState.updated_at;
    applySync(syncState);
  }, [syncState, applySync]);

  // Report time updates
  const handleTimeUpdate = useCallback((e: Event) => {
    if (!onTimeUpdate) return;
    const target = e.target as HTMLMediaElement;
    if (target) onTimeUpdate(target.currentTime);
  }, [onTimeUpdate]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !onTimeUpdate) return;
    player.addEventListener("timeupdate", handleTimeUpdate);
    return () => player.removeEventListener("timeupdate", handleTimeUpdate);
  }, [onTimeUpdate, handleTimeUpdate]);

  if (!playbackId) {
    return (
      <div className="relative w-full aspect-video bg-[var(--room-surface)] rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-[var(--room-text-secondary)] mb-1">Screening Room</p>
          <p className="text-sm text-[var(--room-text-muted)]">Waiting for the show to start...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        streamType="on-demand"
        autoPlay={false}
        muted={false}
        // Mux Data: engagement & viewer experience tracking
        metadata={{
          video_title: "FlightStory Community Screening",
          viewer_user_id: typeof window !== "undefined" ? localStorage.getItem("viewer_id") || undefined : undefined,
          video_series: "FlightStory Screenings",
        }}
        // Env key for Mux Data (set via environment variable)
        envKey={process.env.NEXT_PUBLIC_MUX_ENV_KEY}
        // Styling — minimal chrome for cinema feel
        primaryColor="#FFFFFF"
        secondaryColor="#000000"
        style={{ width: "100%", height: "100%", aspectRatio: "16/9" }}
      />
    </div>
  );
}
