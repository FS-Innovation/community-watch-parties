"use client";

import type { HostLayout } from "@/lib/types";

interface Props {
  layout: HostLayout;
  visible: boolean;
}

export default function HostCameraLayer({ layout, visible }: Props) {
  if (!visible) return null;

  if (layout === "pip") {
    return (
      <div className="host-pip w-48 h-36 bg-[var(--room-surface)]">
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--room-surface-hover)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--room-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[10px] text-[var(--room-text-muted)]">Host Camera</p>
            <p className="text-[9px] text-[var(--room-text-muted)] opacity-60">LiveKit WebRTC</p>
          </div>
        </div>
      </div>
    );
  }

  // Side panel layout
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="w-full aspect-video rounded-lg bg-[var(--room-surface)] border border-[var(--room-border)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs text-[var(--room-text-muted)]">Host Camera Feed</p>
          <p className="text-[10px] text-[var(--room-text-muted)] opacity-60 mt-1">LiveKit WebRTC</p>
        </div>
      </div>
    </div>
  );
}
