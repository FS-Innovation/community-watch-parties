"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ScreenControlsProps {
  onVideoElement: (video: HTMLVideoElement | null) => void;
  onYoutubeUrl: (url: string) => void;
  isSeated: boolean;
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function ScreenControls({
  onVideoElement,
  onYoutubeUrl,
  isSeated,
}: ScreenControlsProps) {
  const [mode, setMode] = useState<"none" | "youtube" | "screenshare">("none");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [activeYoutubeId, setActiveYoutubeId] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopScreenShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    onVideoElement(null);
    setIsSharing(false);
    setMode("none");
  }, [onVideoElement]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      videoRef.current = video;
      onVideoElement(video);
      setIsSharing(true);
      setMode("screenshare");

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch {
      // User cancelled
    }
  }, [onVideoElement, stopScreenShare]);

  const handleYoutubeSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const id = extractYoutubeId(youtubeInput.trim());
      if (id) {
        setActiveYoutubeId(id);
        setMode("youtube");
        onYoutubeUrl(id);
        // Stop any screen share
        if (isSharing) stopScreenShare();
      }
    },
    [youtubeInput, isSharing, stopScreenShare, onYoutubeUrl]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setShowPanel((p) => !p)}
        className="absolute top-4 right-4 z-30 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm hover:border-[var(--doac-orange)]/50 transition-all cursor-pointer"
      >
        {showPanel ? "Close" : "Screen"}
      </button>

      {/* Control panel */}
      {showPanel && (
        <div className="absolute top-14 right-4 z-30 w-80 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4 tracking-wide uppercase">
            Screen Content
          </h3>

          {/* YouTube */}
          <form onSubmit={handleYoutubeSubmit} className="mb-4">
            <label className="block text-xs text-white/50 mb-1.5">
              YouTube URL or Video ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="Paste YouTube link..."
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--doac-orange)]"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-[var(--doac-orange)] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
              >
                Play
              </button>
            </div>
          </form>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Screen share */}
          {!isSharing ? (
            <button
              onClick={startScreenShare}
              className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 hover:border-[var(--doac-orange)]/30 transition-all cursor-pointer"
            >
              Share Your Screen
            </button>
          ) : (
            <button
              onClick={stopScreenShare}
              className="w-full py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-sm text-red-300 hover:bg-red-500/30 transition-all cursor-pointer"
            >
              Stop Sharing
            </button>
          )}

          {/* Status */}
          {mode !== "none" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {mode === "youtube"
                ? `Playing YouTube: ${activeYoutubeId}`
                : "Screen sharing active"}
            </div>
          )}
        </div>
      )}

      {/* YouTube iframe overlay positioned over the 3D screen */}
      {mode === "youtube" && activeYoutubeId && isSeated && (
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-20 w-[60%] aspect-video pointer-events-auto">
          <iframe
            src={`https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="w-full h-full rounded-lg"
            style={{ border: "none" }}
          />
        </div>
      )}
    </>
  );
}
