"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

export default function HostPage() {
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [coHosts, setCoHosts] = useState<string[]>([]);
  const [newCoHost, setNewCoHost] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Camera toggle with real getUserMedia
  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      // Stop camera
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: micEnabled,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraEnabled(true);
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
  }, [cameraEnabled, micEnabled]);

  // Mic toggle
  const toggleMic = useCallback(async () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach((t) => (t.enabled = !micEnabled));
        setMicEnabled(!micEnabled);
      } else if (!micEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach((t) => streamRef.current?.addTrack(t));
          setMicEnabled(true);
        } catch (err) {
          console.error("Mic access denied:", err);
        }
      }
    } else {
      setMicEnabled(!micEnabled);
    }
  }, [micEnabled]);

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (screenRef.current) screenRef.current.srcObject = null;
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = stream;
        if (screenRef.current) screenRef.current.srcObject = stream;
        setScreenSharing(true);
        // Listen for the user stopping via browser UI
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          setScreenSharing(false);
          if (screenRef.current) screenRef.current.srcObject = null;
        });
      } catch (err) {
        console.error("Screen share denied:", err);
      }
    }
  }, [screenSharing]);

  // Add co-host
  const addCoHost = () => {
    if (!newCoHost.trim() || coHosts.includes(newCoHost.trim())) return;
    setCoHosts((prev) => [...prev, newCoHost.trim()]);
    setNewCoHost("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <main className="min-h-screen p-6" style={{ background: "var(--room-bg)" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Host Studio</h1>
            <p className="text-sm text-[var(--room-text-muted)]">
              Your camera, mic, and screen are shared with all viewers.
            </p>
            <p className="text-xs text-[var(--room-text-muted)] mt-1">
              <Link href="/" className="text-[var(--room-accent)] hover:underline">Open viewer</Link>
              {" | "}
              <Link href="/admin" className="text-[var(--room-accent)] hover:underline">Open admin</Link>
            </p>
          </div>
          <span className="text-[10px] text-[var(--room-text-muted)] border border-[var(--room-border)] rounded px-2 py-0.5">
            Host Studio
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Preview */}
          <div className="admin-card">
            <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Camera</h2>
            <div className="aspect-video w-full rounded-xl bg-[var(--room-surface)] border border-[var(--room-border)] overflow-hidden mb-4">
              {cameraEnabled ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[var(--room-surface-hover)] flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--room-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-xs text-[var(--room-text-muted)]">Camera off</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleCamera}
                className={cameraEnabled ? "btn-accent text-sm flex-1" : "btn-ghost text-sm flex-1"}
              >
                {cameraEnabled ? "Stop Camera" : "Start Camera"}
              </button>
              <button
                onClick={toggleMic}
                className={micEnabled ? "btn-accent text-sm flex-1" : "btn-ghost text-sm flex-1"}
              >
                {micEnabled ? "Mute Mic" : "Unmute Mic"}
              </button>
            </div>
          </div>

          {/* Screen Share */}
          <div className="admin-card">
            <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Screen Share</h2>
            <div className="aspect-video w-full rounded-xl bg-[var(--room-surface)] border border-[var(--room-border)] overflow-hidden mb-4">
              {screenSharing ? (
                <video ref={screenRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[var(--room-surface-hover)] flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--room-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-xs text-[var(--room-text-muted)]">Not sharing</p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={toggleScreenShare}
              className={screenSharing ? "btn-accent text-sm w-full" : "btn-ghost text-sm w-full"}
            >
              {screenSharing ? "Stop Sharing" : "Share Screen"}
            </button>
          </div>
        </div>

        {/* Co-hosts */}
        <div className="admin-card mt-6">
          <h2 className="font-semibold text-sm mb-4 text-[var(--room-accent)]">Co-hosts</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={newCoHost}
              onChange={(e) => setNewCoHost(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCoHost()}
              className="admin-input flex-1"
              placeholder="Co-host name or email"
            />
            <button onClick={addCoHost} className="btn-accent text-xs" disabled={!newCoHost.trim()}>
              Add
            </button>
          </div>
          {coHosts.length === 0 ? (
            <p className="text-xs text-[var(--room-text-muted)]">No co-hosts added. You are the sole host.</p>
          ) : (
            <div className="space-y-2">
              {coHosts.map((host) => (
                <div key={host} className="flex items-center justify-between p-2 rounded bg-[var(--room-bg)] text-sm">
                  <span className="text-[var(--room-text-secondary)]">{host}</span>
                  <button
                    onClick={() => setCoHosts((prev) => prev.filter((h) => h !== host))}
                    className="text-xs text-[var(--room-text-muted)] hover:text-[var(--room-red)]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[var(--room-text-muted)] mt-2">
            Co-hosts join via LiveKit. Each gets their own camera/mic controls.
          </p>
        </div>

        {/* Connection Status */}
        <div className="admin-card mt-6">
          <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Status</h2>
          <div className="space-y-2 text-sm">
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
              <span className="text-[var(--room-text-secondary)]">Screen Share</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                screenSharing
                  ? "bg-green-500/10 text-[var(--room-green)]"
                  : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"
              }`}>
                {screenSharing ? "Sharing" : "Off"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--room-text-secondary)]">Co-hosts</span>
              <span className="text-xs text-[var(--room-text-muted)] px-2 py-0.5 rounded bg-[var(--room-surface)]">
                {coHosts.length} connected
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
