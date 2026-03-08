"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  videoId?: string;
  isHost?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideoPlayer({
  videoId = "dQw4w9WgXcQ",
  isHost = false,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [viewerCount] = useState(Math.floor(Math.random() * 50) + 12);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    function initPlayer() {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: isHost ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => setIsReady(true),
        },
      });
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      playerRef.current?.destroy();
    };
  }, [videoId, isHost]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Ambient glow behind the screen */}
      <div className="absolute -inset-4 screen-glow rounded-2xl opacity-50 pointer-events-none" />

      {/* Video container */}
      <div className="relative flex-1 rounded-xl overflow-hidden bg-black border border-[var(--doac-border)]">
        <div ref={containerRef} className="w-full h-full" />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--doac-dark)]">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[var(--doac-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--doac-text-muted)]">
                Loading the screening room...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Viewer count */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm text-[var(--doac-text-muted)]">
          <span className="text-[var(--doac-text)] font-medium">
            {viewerCount}
          </span>{" "}
          watching now
        </span>
      </div>

      {/* Host controls */}
      {isHost && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => playerRef.current?.playVideo()}
            className="px-4 py-2 rounded-lg bg-[var(--doac-orange)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
          >
            Play for All
          </button>
          <button
            onClick={() => playerRef.current?.pauseVideo()}
            className="px-4 py-2 rounded-lg bg-[var(--doac-dark)] border border-[var(--doac-border)] text-sm text-[var(--doac-text)] hover:border-[var(--doac-orange)] transition-all cursor-pointer"
          >
            Pause for All
          </button>
        </div>
      )}
    </div>
  );
}
