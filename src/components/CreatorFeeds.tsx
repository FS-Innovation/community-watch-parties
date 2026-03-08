"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface CreatorFeed {
  id: string;
  name: string;
  stream: MediaStream | null;
  side: "left" | "right";
}

interface CreatorFeedsProps {
  onLeftFeed: (video: HTMLVideoElement | null) => void;
  onRightFeed: (video: HTMLVideoElement | null) => void;
}

export default function CreatorFeeds({ onLeftFeed, onRightFeed }: CreatorFeedsProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [feeds, setFeeds] = useState<CreatorFeed[]>([
    { id: "left", name: "Steven Bartlett", stream: null, side: "left" },
    { id: "right", name: "Guest Creator", stream: null, side: "right" },
  ]);
  const videoElementsRef = useRef<Record<string, HTMLVideoElement>>({});

  const startCreatorCam = useCallback(
    async (feedId: string) => {
      try {
        // In production this would be a Daily.co / WebRTC feed from the creator
        // For demo, we use the local webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360 },
          audio: false,
        });

        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        videoElementsRef.current[feedId] = video;

        setFeeds((prev) =>
          prev.map((f) => (f.id === feedId ? { ...f, stream } : f))
        );

        const feed = feeds.find((f) => f.id === feedId);
        if (feed?.side === "left") onLeftFeed(video);
        else onRightFeed(video);
      } catch {
        // User denied camera or not available
      }
    },
    [feeds, onLeftFeed, onRightFeed]
  );

  const stopCreatorCam = useCallback(
    (feedId: string) => {
      const feed = feeds.find((f) => f.id === feedId);
      if (feed?.stream) {
        feed.stream.getTracks().forEach((t) => t.stop());
      }
      const video = videoElementsRef.current[feedId];
      if (video) {
        video.pause();
        video.srcObject = null;
        delete videoElementsRef.current[feedId];
      }

      setFeeds((prev) =>
        prev.map((f) => (f.id === feedId ? { ...f, stream: null } : f))
      );

      if (feed?.side === "left") onLeftFeed(null);
      else onRightFeed(null);
    },
    [feeds, onLeftFeed, onRightFeed]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(videoElementsRef.current).forEach((video) => {
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach((t) => t.stop());
        video.pause();
      });
    };
  }, []);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setShowPanel((p) => !p)}
        className="absolute top-4 left-4 z-30 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm hover:border-[#8844ff]/50 transition-all cursor-pointer"
      >
        {showPanel ? "Close" : "Creators"}
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="absolute top-14 left-4 z-30 w-72 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4 tracking-wide uppercase">
            Creator Feeds
          </h3>
          <p className="text-xs text-white/40 mb-4">
            Side screens show live creator webcam feeds. In production, creators
            join via a private link (Daily.co). For demo, uses your webcam.
          </p>

          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm text-white font-medium">
                    {feed.name}
                  </span>
                  <span className="text-xs text-white/30 ml-2">
                    ({feed.side} screen)
                  </span>
                </div>
                {feed.stream && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
              </div>

              {!feed.stream ? (
                <button
                  onClick={() => startCreatorCam(feed.id)}
                  className="w-full py-2 rounded-lg bg-[#8844ff]/20 border border-[#8844ff]/30 text-sm text-[#aa88ff] hover:bg-[#8844ff]/30 transition-all cursor-pointer"
                >
                  Go Live (Demo: Use Webcam)
                </button>
              ) : (
                <button
                  onClick={() => stopCreatorCam(feed.id)}
                  className="w-full py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-sm text-red-300 hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  End Feed
                </button>
              )}
            </div>
          ))}

          <p className="text-xs text-white/25 mt-3">
            In production: creators get a private Daily.co link. Their video
            streams directly to the side screens for all viewers.
          </p>
        </div>
      )}
    </>
  );
}
