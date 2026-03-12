"use client";

import { useState } from "react";
import Link from "next/link";

export default function HostPage() {
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  return (
    <main className="min-h-screen p-6" style={{ background: "var(--room-bg)" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Host Studio</h1>
            <p className="text-sm text-[var(--room-text-muted)]">
              You&apos;re a host. Your camera and mic are shared with all viewers.
            </p>
            <p className="text-xs text-[var(--room-text-muted)] mt-1">
              <Link href="/" className="text-[var(--room-accent)] hover:underline">Open viewer</Link>
              {" | "}
              <Link href="/admin" className="text-[var(--room-accent)] hover:underline">Open admin</Link>
            </p>
          </div>
          <span className="text-[10px] text-[var(--room-text-muted)] border border-[var(--room-border)] rounded px-2 py-0.5">
            Host Preview
          </span>
        </div>

        {/* Camera Preview */}
        <div className="admin-card mb-6">
          <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Camera Preview</h2>
          <div className="aspect-video w-full rounded-xl bg-[var(--room-surface)] border border-[var(--room-border)] flex items-center justify-center mb-4">
            <div className="text-center">
              {cameraEnabled ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--room-surface-hover)] flex items-center justify-center">
                    <svg className="w-8 h-8 text-[var(--room-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--room-green)]">Camera Active</p>
                  <p className="text-xs text-[var(--room-text-muted)] mt-1">
                    LiveKit WebRTC feed renders here
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--room-surface-hover)] flex items-center justify-center">
                    <svg className="w-8 h-8 text-[var(--room-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--room-text-muted)]">Camera Off</p>
                  <p className="text-xs text-[var(--room-text-muted)] mt-1">
                    Click &quot;Enable Camera&quot; to start
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={cameraEnabled ? "btn-accent text-sm flex-1" : "btn-ghost text-sm flex-1"}
            >
              {cameraEnabled ? "Disable Camera" : "Enable Camera"}
            </button>
            <button
              onClick={() => setMicEnabled(!micEnabled)}
              className={micEnabled ? "btn-accent text-sm flex-1" : "btn-ghost text-sm flex-1"}
            >
              {micEnabled ? "Mute Mic" : "Enable Mic"}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="admin-card mb-6">
          <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Connection Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--room-text-secondary)]">LiveKit Room</span>
              <span className="text-xs text-[var(--room-text-muted)] px-2 py-0.5 rounded bg-[var(--room-surface)]">
                Not connected (preview mode)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--room-text-secondary)]">Camera</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                cameraEnabled
                  ? "bg-green-500/10 text-[var(--room-green)]"
                  : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"
              }`}>
                {cameraEnabled ? "Active" : "Off"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--room-text-secondary)]">Microphone</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                micEnabled
                  ? "bg-green-500/10 text-[var(--room-green)]"
                  : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"
              }`}>
                {micEnabled ? "Active" : "Off"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--room-text-secondary)]">Composited to Mux</span>
              <span className="text-xs text-[var(--room-text-muted)] px-2 py-0.5 rounded bg-[var(--room-surface)]">
                RTMP egress (not configured)
              </span>
            </div>
          </div>
        </div>

        {/* LiveKit Integration Notes */}
        <div className="admin-card">
          <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Integration Notes</h2>
          <div className="text-xs text-[var(--room-text-muted)] space-y-2">
            <p>This page will connect to LiveKit Cloud when credentials are configured in <code className="text-[var(--room-text-secondary)]">.env</code>.</p>
            <p>Hosts join a LiveKit room. Their camera + mic are composited via RTMP to Mux for HLS delivery to all viewers.</p>
            <p>For lower-latency host feeds, switch to WebRTC egress (viewers subscribe directly to LiveKit tracks).</p>
            <p>The admin dashboard controls mute/unmute, camera visibility, and PiP vs side panel layout.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
