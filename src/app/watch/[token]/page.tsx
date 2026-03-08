"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import ScreenControls from "@/components/ScreenControls";

// Dynamic import to avoid SSR issues with Three.js
const Auditorium3D = dynamic(() => import("@/components/Auditorium3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#050510]">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[var(--doac-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[var(--doac-text-muted)]">
          Building the auditorium...
        </p>
      </div>
    </div>
  ),
});

interface UserData {
  id: string;
  name: string;
  email: string;
}

export default function WatchRoom() {
  const params = useParams();
  const token = params.token as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">(
    "loading"
  );
  const [isSeated, setIsSeated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [viewerCount] = useState(Math.floor(Math.random() * 80) + 24);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch("/api/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          setStatus("denied");
          return;
        }

        const data = await res.json();
        setUser(data.user);
        setStatus("authorized");
      } catch {
        setStatus("denied");
      }
    }

    verify();
  }, [token]);

  const handleSit = useCallback((seated: boolean) => {
    setIsSeated(seated);
  }, []);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050510]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[var(--doac-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--doac-text-muted)]">
            Verifying your access...
          </p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050510]">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-[var(--doac-text-muted)] mb-6">
            This access token is invalid or has expired. Please check your email
            for the correct link.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-[var(--doac-orange)] text-white font-medium hover:brightness-110 transition-all"
          >
            Register for a Watch Party
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#050510] relative">
      {/* 3D Auditorium */}
      <div className="absolute inset-0 z-0">
        <Auditorium3D
          onSit={handleSit}
          videoElement={videoElement}
          youtubeUrl={youtubeUrl}
        />
      </div>

      {/* Top bar overlay */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-xs tracking-[0.2em] uppercase text-[var(--doac-orange)] font-semibold">
            DOAC
          </span>
          <span className="text-xs text-white/40">Watch Party</span>
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white/60">
              <span className="text-white font-medium">{viewerCount}</span>{" "}
              watching
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-white/60">{user?.name}</span>
          </div>
        </div>
      </header>

      {/* Screen controls (YouTube / Screen Share) */}
      <ScreenControls
        onVideoElement={setVideoElement}
        onYoutubeUrl={setYoutubeUrl}
        isSeated={isSeated}
      />

      {/* Chat toggle */}
      <button
        onClick={() => setChatOpen((p) => !p)}
        className="absolute bottom-6 right-6 z-30 px-4 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm hover:border-[var(--doac-orange)]/50 transition-all cursor-pointer"
      >
        {chatOpen ? "Close Chat" : "Chat"}
      </button>

      {/* Chat panel overlay */}
      {chatOpen && (
        <div className="absolute bottom-16 right-6 z-30 w-80 h-[50vh] rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 overflow-hidden animate-fade-in">
          <ChatPanel userName={user?.name || "Guest"} />
        </div>
      )}
    </main>
  );
}
