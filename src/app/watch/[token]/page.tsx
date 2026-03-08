"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import ScreenControls from "@/components/ScreenControls";
import CreatorFeeds from "@/components/CreatorFeeds";
import StageAudio from "@/components/StageAudio";

const Auditorium3D = dynamic(() => import("@/components/Auditorium3D"), {
  ssr: false,
  loading: () => <LoadingScreen text="Building the auditorium..." />,
});

const Lobby3D = dynamic(() => import("@/components/Lobby3D"), {
  ssr: false,
  loading: () => <LoadingScreen text="Entering the lounge..." />,
});

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#050510]">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[var(--doac-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[var(--doac-text-muted)]">{text}</p>
      </div>
    </div>
  );
}

interface UserData {
  id: string;
  name: string;
  email: string;
  seatNumber?: number;
  role?: "host" | "viewer";
}

export default function WatchRoom() {
  const params = useParams();
  const token = params.token as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">("loading");
  const [room, setRoom] = useState<"lobby" | "cinema">("lobby");
  const [isSeated, setIsSeated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [, setYoutubeUrl] = useState("");
  const [leftSideVideo, setLeftSideVideo] = useState<HTMLVideoElement | null>(null);
  const [rightSideVideo, setRightSideVideo] = useState<HTMLVideoElement | null>(null);
  const [viewerCount] = useState(Math.floor(Math.random() * 180) + 47);
  const [showLive, setShowLive] = useState(false);
  const auditoriumRef = useRef<HTMLDivElement>(null);

  const isHost = user?.role === "host";

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch("/api/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) { setStatus("denied"); return; }
        const data = await res.json();
        setUser(data.user);
        setStatus("authorized");
      } catch { setStatus("denied"); }
    }
    verify();
  }, [token]);

  // Poll show status
  useEffect(() => {
    if (status !== "authorized") return;
    const poll = async () => {
      try {
        const res = await fetch("/api/show-status");
        const data = await res.json();
        setShowLive(data.showLive);
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [status]);

  // When entering cinema during live show, auto-seat after a short delay
  useEffect(() => {
    if (room !== "cinema" || !showLive || !user?.seatNumber) return;
    const timer = setTimeout(() => {
      const mount = auditoriumRef.current?.querySelector("[data-auditorium]") || auditoriumRef.current?.firstElementChild;
      const el = mount as HTMLElement & { __autoSeat?: (n: number) => void };
      el?.__autoSeat?.(user.seatNumber!);
    }, 1500);
    return () => clearTimeout(timer);
  }, [room, showLive, user?.seatNumber]);

  // Sync showLive to Auditorium3D
  useEffect(() => {
    if (room !== "cinema") return;
    const timer = setTimeout(() => {
      const mount = auditoriumRef.current?.querySelector("[data-auditorium]") || auditoriumRef.current?.firstElementChild;
      const el = mount as HTMLElement & { __setShowLive?: (v: boolean) => void };
      el?.__setShowLive?.(showLive);
    }, 500);
    return () => clearTimeout(timer);
  }, [room, showLive]);

  const handleLeaveSeat = useCallback(() => {
    setRoom("lobby");
    setIsSeated(false);
  }, []);

  const toggleShow = useCallback(async (action: "start" | "stop") => {
    try {
      const res = await fetch("/api/show-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token }),
      });
      const data = await res.json();
      setShowLive(data.showLive);
    } catch { /* ignore */ }
  }, [token]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050510]">
        <LoadingScreen text="Verifying your access..." />
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050510]">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-[var(--doac-text-muted)] mb-6">
            This access token is invalid or has expired.
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

  // ─── LOBBY ───
  if (room === "lobby") {
    return (
      <main className="h-screen w-screen overflow-hidden bg-[#050510] relative">
        <div className="absolute inset-0 z-0">
          <Lobby3D onEnterCinema={() => setRoom("cinema")} />
        </div>

        {/* Top bar */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <span className="text-xs tracking-[0.2em] uppercase text-[var(--doac-orange)] font-semibold">DOAC</span>
            <span className="text-xs text-white/40">Lounge</span>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
            {showLive && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-300 font-medium">LIVE NOW</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-white/60">
                <span className="text-white font-medium">{viewerCount}</span> here
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-white/60">{user?.name}</span>
              {user?.seatNumber && (
                <span className="text-xs text-[var(--doac-orange)]">Seat #{user.seatNumber}</span>
              )}
              {isHost && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--doac-orange)]/20 text-[10px] text-[var(--doac-orange)] font-semibold uppercase">Host</span>
              )}
            </div>
          </div>
        </header>
      </main>
    );
  }

  // ─── CINEMA ───
  return (
    <main className="h-screen w-screen overflow-hidden bg-[#050510] relative">
      <div className="absolute inset-0 z-0" ref={auditoriumRef}>
        <Auditorium3D
          onSit={setIsSeated}
          videoElement={videoElement}
          leftSideVideo={leftSideVideo}
          rightSideVideo={rightSideVideo}
          assignedSeat={user?.seatNumber}
          showLive={showLive}
          onLeaveSeat={handleLeaveSeat}
        />
      </div>

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-xs tracking-[0.2em] uppercase text-[var(--doac-orange)] font-semibold">DOAC</span>
          <span className="text-xs text-white/40">Cinema</span>
          {!showLive && (
            <button
              onClick={() => setRoom("lobby")}
              className="text-xs text-white/30 hover:text-[var(--doac-orange)] transition-colors ml-2 cursor-pointer"
            >
              Back to Lounge
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          {showLive && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-300 font-medium">LIVE</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white/60">
              <span className="text-white font-medium">{viewerCount}</span> watching
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-white/60">{user?.name}</span>
            {user?.seatNumber && (
              <span className="text-xs text-[var(--doac-orange)]">#{user.seatNumber}</span>
            )}
            {isHost && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--doac-orange)]/20 text-[10px] text-[var(--doac-orange)] font-semibold uppercase">Host</span>
            )}
          </div>
        </div>
      </header>

      {/* Host controls: Show toggle */}
      {isHost && (
        <div className="absolute top-14 right-4 z-30 pointer-events-auto">
          {!showLive ? (
            <button
              onClick={() => toggleShow("start")}
              className="px-4 py-2 rounded-xl bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Start Show
            </button>
          ) : (
            <button
              onClick={() => toggleShow("stop")}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-all cursor-pointer"
            >
              End Show
            </button>
          )}
        </div>
      )}

      {/* Creator feeds — host only */}
      {isHost && (
        <CreatorFeeds onLeftFeed={setLeftSideVideo} onRightFeed={setRightSideVideo} />
      )}

      {/* Screen controls — host only */}
      {isHost && (
        <ScreenControls
          onVideoElement={setVideoElement}
          onYoutubeUrl={setYoutubeUrl}
          isSeated={isSeated}
        />
      )}

      {/* Stage audio — always visible, but capabilities differ by role */}
      <StageAudio isHost={isHost} userName={user?.name || "Guest"} />

      <button
        onClick={() => setChatOpen((p) => !p)}
        className="absolute bottom-6 right-6 z-30 px-4 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm hover:border-[var(--doac-orange)]/50 transition-all cursor-pointer"
      >
        {chatOpen ? "Close Chat" : "Chat"}
      </button>

      {chatOpen && (
        <div className="absolute bottom-16 right-6 z-30 w-80 h-[50vh] rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 overflow-hidden animate-fade-in">
          <ChatPanel userName={user?.name || "Guest"} />
        </div>
      )}
    </main>
  );
}
