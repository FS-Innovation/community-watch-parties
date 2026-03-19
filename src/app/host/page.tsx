"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { ViewerQuestion } from "@/lib/types";

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

  // Host dashboard data
  const [questions, setQuestions] = useState<ViewerQuestion[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [reactionPulse, setReactionPulse] = useState(0);
  const [eventStatus, setEventStatus] = useState("waiting");

  // Load host dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      const [syncRes, presenceRes, questionsRes, reactionsRes] = await Promise.all([
        fetch("/api/sync?event_id=demo-event"),
        fetch("/api/presence?event_id=demo-event"),
        fetch("/api/questions?event_id=demo-event"),
        fetch("/api/reactions?event_id=demo-event&window=30"),
      ]);

      const syncData = await syncRes.json();
      const presenceData = await presenceRes.json();
      const questionsData = await questionsRes.json();
      const reactionsData = await reactionsRes.json();

      if (syncData.event_status) setEventStatus(syncData.event_status);
      setViewerCount(presenceData.count || 0);
      setQuestions(questionsData.questions || []);
      setReactionPulse(reactionsData.count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Camera toggle
  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
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
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        if (screenRef.current) screenRef.current.srcObject = stream;
        setScreenSharing(true);
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          setScreenSharing(false);
          if (screenRef.current) screenRef.current.srcObject = null;
        });
      } catch (err) {
        console.error("Screen share denied:", err);
      }
    }
  }, [screenSharing]);

  const addCoHost = () => {
    if (!newCoHost.trim() || coHosts.includes(newCoHost.trim())) return;
    setCoHosts((prev) => [...prev, newCoHost.trim()]);
    setNewCoHost("");
  };

  // Feature / answer a question
  const handleQuestion = async (questionId: string, action: "feature" | "answer") => {
    await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        question_id: questionId,
        ...(action === "feature" ? { is_featured: true } : {}),
      }),
    });
    loadDashboard();
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const pulseIntensity = Math.min(1, reactionPulse / 50);

  return (
    <main className="min-h-screen p-6" style={{ background: "var(--room-bg)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Host Dashboard</h1>
            <p className="text-sm text-[var(--room-text-muted)]">
              Steven&apos;s MacBook view. Camera, questions, audience pulse.
            </p>
            <p className="text-xs text-[var(--room-text-muted)] mt-1">
              <Link href="/" className="text-[var(--room-accent)] hover:underline">Viewer</Link>
              {" | "}
              <Link href="/admin" className="text-[var(--room-accent)] hover:underline">Admin</Link>
              {" | "}
              <Link href="/profile" className="text-[var(--room-accent)] hover:underline">Profile</Link>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="presence-badge">
              <span className="presence-dot" />
              <span>{viewerCount.toLocaleString()} watching</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              eventStatus === "live" ? "bg-green-500/10 text-green-400" : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"
            }`}>
              {eventStatus.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Column 1: Camera + Controls ─── */}
          <div className="space-y-6">
            {/* Camera Preview */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Your Camera</h2>
              <div className="aspect-video w-full rounded-xl bg-[var(--room-surface)] border border-[var(--room-border)] overflow-hidden mb-3">
                {cameraEnabled ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-[var(--room-text-muted)]">Camera off</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={toggleCamera} className={cameraEnabled ? "btn-accent text-xs flex-1" : "btn-ghost text-xs flex-1"}>
                  {cameraEnabled ? "Stop Camera" : "Start Camera"}
                </button>
                <button onClick={toggleMic} className={micEnabled ? "btn-accent text-xs flex-1" : "btn-ghost text-xs flex-1"}>
                  {micEnabled ? "Mute" : "Unmute"}
                </button>
              </div>
            </div>

            {/* Screen Share */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Screen Share</h2>
              <div className="aspect-video w-full rounded-xl bg-[var(--room-surface)] border border-[var(--room-border)] overflow-hidden mb-3">
                {screenSharing ? (
                  <video ref={screenRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-[var(--room-text-muted)]">Not sharing</p>
                  </div>
                )}
              </div>
              <button onClick={toggleScreenShare} className={screenSharing ? "btn-accent text-xs w-full" : "btn-ghost text-xs w-full"}>
                {screenSharing ? "Stop Sharing" : "Share Screen"}
              </button>
            </div>

            {/* Co-hosts */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Co-hosts</h2>
              <div className="flex gap-2 mb-2">
                <input
                  value={newCoHost}
                  onChange={(e) => setNewCoHost(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCoHost()}
                  className="admin-input flex-1"
                  placeholder="Co-host name"
                />
                <button onClick={addCoHost} className="btn-accent text-xs" disabled={!newCoHost.trim()}>Add</button>
              </div>
              {coHosts.length === 0 ? (
                <p className="text-[10px] text-[var(--room-text-muted)]">No co-hosts.</p>
              ) : (
                <div className="space-y-1">
                  {coHosts.map((host) => (
                    <div key={host} className="flex items-center justify-between p-1.5 rounded bg-[var(--room-bg)] text-xs">
                      <span className="text-[var(--room-text-secondary)]">{host}</span>
                      <button onClick={() => setCoHosts(prev => prev.filter(h => h !== host))} className="text-[var(--room-text-muted)] hover:text-[var(--room-red)] text-[10px]">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Column 2: Curated Questions ─── */}
          <div className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-[var(--room-accent)]">Audience Questions</h2>
                <span className="text-[10px] text-[var(--room-text-muted)]">{questions.length} total</span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {questions.length === 0 ? (
                  <p className="text-xs text-[var(--room-text-muted)] py-4 text-center">
                    No questions yet. They&apos;ll appear here when viewers submit them.
                  </p>
                ) : (
                  questions.map((q) => (
                    <motion.div
                      key={q.id}
                      layout
                      className={`p-3 rounded-lg border transition-colors ${
                        q.is_featured
                          ? "border-[var(--room-accent)] bg-[var(--room-accent-glow)]"
                          : q.is_answered
                            ? "border-[var(--room-border)] bg-[var(--room-bg)] opacity-50"
                            : "border-[var(--room-border)] bg-[var(--room-bg)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] text-[var(--room-text-muted)]">
                          {q.display_name}
                          {q.source === "registration" && (
                            <span className="ml-1 text-[8px] uppercase tracking-wider opacity-50">reg</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-[var(--room-text-muted)] font-mono">
                            {q.upvotes > 0 && `+${q.upvotes}`}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--room-text)] leading-relaxed mb-2">
                        {q.question_text}
                      </p>
                      <div className="flex gap-1.5">
                        {!q.is_featured && !q.is_answered && (
                          <button
                            onClick={() => handleQuestion(q.id, "feature")}
                            className="btn-ghost text-[10px] px-2 py-1"
                          >
                            Spotlight
                          </button>
                        )}
                        {!q.is_answered && (
                          <button
                            onClick={() => handleQuestion(q.id, "answer")}
                            className="btn-ghost text-[10px] px-2 py-1"
                          >
                            Mark answered
                          </button>
                        )}
                        {q.is_answered && (
                          <span className="text-[9px] text-[var(--room-green)] uppercase tracking-wider">Answered</span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ─── Column 3: Audience Pulse + Face Grid ─── */}
          <div className="space-y-6">
            {/* Audience Pulse Visualization */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Audience Pulse</h2>
              <div className="relative h-24 rounded-xl bg-[var(--room-bg)] border border-[var(--room-border)] overflow-hidden flex items-center justify-center">
                {/* Pulse glow */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: `radial-gradient(ellipse at center, hsla(${220 - pulseIntensity * 180}, ${40 + pulseIntensity * 40}%, ${15 + pulseIntensity * 30}%, ${pulseIntensity * 0.3}) 0%, transparent 70%)`,
                  }}
                  transition={{ duration: 1 }}
                />
                <div className="text-center relative z-10">
                  <p className="text-2xl font-bold font-mono">{reactionPulse}</p>
                  <p className="text-[9px] text-[var(--room-text-muted)] tracking-wider uppercase">
                    reactions / 30s
                  </p>
                </div>
              </div>
            </div>

            {/* Face Grid (placeholder — requires LiveKit in production) */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Audience Faces</h2>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-[var(--room-bg)] border border-[var(--room-border)] flex items-center justify-center"
                  >
                    <span className="text-[var(--room-text-muted)] text-lg">
                      {i < viewerCount ? "👤" : ""}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-[var(--room-text-muted)] mt-2">
                Rotating subset of audience. Requires LiveKit in production.
              </p>
            </div>

            {/* Quick Status */}
            <div className="admin-card">
              <h2 className="font-semibold text-sm mb-3 text-[var(--room-accent)]">Status</h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Camera", active: cameraEnabled },
                  { label: "Mic", active: micEnabled },
                  { label: "Screen", active: screenSharing },
                ].map(({ label, active }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[var(--room-text-secondary)]">{label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      active ? "bg-green-500/10 text-green-400" : "bg-[var(--room-surface)] text-[var(--room-text-muted)]"
                    }`}>{active ? "Active" : "Off"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
