"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SyncState } from "@/lib/types";

interface Props {
  playbackId: string | null;
  syncState: SyncState | null;
  onTimeUpdate?: (time: number) => void;
}

export default function VideoPlayer({ playbackId, syncState, onTimeUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncRef = useRef<number>(0);

  // Apply sync state from server
  const applySync = useCallback((sync: SyncState) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    // Calculate where the video should be right now
    const elapsed = (Date.now() - sync.updated_at) / 1000;
    const targetTime = sync.state === "playing"
      ? sync.timestamp + elapsed * sync.rate
      : sync.timestamp;

    const drift = Math.abs(video.currentTime - targetTime);

    if (drift > 3) {
      // Hard seek — drift too large
      video.currentTime = targetTime;
    } else if (drift > 0.5) {
      // Gentle rate adjustment to drift back
      video.playbackRate = video.currentTime < targetTime ? 1.02 : 0.98;
      // Reset rate after 2 seconds
      setTimeout(() => {
        if (videoRef.current) videoRef.current.playbackRate = sync.rate;
      }, 2000);
    }

    // Play/pause state
    if (sync.state === "playing" && video.paused) {
      video.play().catch(() => {});
    } else if (sync.state === "paused" && !video.paused) {
      video.pause();
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
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;
    const handler = () => onTimeUpdate(video.currentTime);
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [onTimeUpdate]);

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
      {/*
        In production, replace this with:
        <MuxPlayer playbackId={playbackId} streamType="on-demand" />

        For now, using a standard video element that would receive
        the HLS stream URL from Mux: https://stream.mux.com/{playbackId}.m3u8
      */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        controls={false}
      >
        <source
          src={`https://stream.mux.com/${playbackId}.m3u8`}
          type="application/x-mpegURL"
        />
      </video>
    </div>
  );
}
