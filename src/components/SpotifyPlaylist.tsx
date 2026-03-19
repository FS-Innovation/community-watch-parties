"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  playlistUrl: string | null;
  isVisible: boolean;
}

export default function SpotifyPlaylist({ playlistUrl, isVisible }: Props) {
  const [muted, setMuted] = useState(false);

  if (!playlistUrl || !isVisible) return null;

  // Extract playlist ID from URL
  // Supports: https://open.spotify.com/playlist/xxxxx or spotify:playlist:xxxxx
  let playlistId = "";
  if (playlistUrl.includes("spotify.com/playlist/")) {
    playlistId = playlistUrl.split("playlist/")[1]?.split("?")[0] || "";
  } else if (playlistUrl.includes("spotify:playlist:")) {
    playlistId = playlistUrl.split("spotify:playlist:")[1] || "";
  } else {
    playlistId = playlistUrl; // Assume it's just the ID
  }

  if (!playlistId) return null;

  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute bottom-6 left-6 z-[15]"
        >
          <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            style={{
              width: 300,
              height: muted ? 80 : 152,
              transition: "height 0.3s ease",
            }}
          >
            {!muted && (
              <iframe
                src={embedUrl}
                width="300"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-xl"
                title="Steven's Playlist"
              />
            )}

            {muted && (
              <div className="w-full h-full bg-[var(--room-surface)] flex items-center justify-center gap-3 px-4">
                <span className="text-xs text-[var(--room-text-muted)]">Steven&apos;s Playlist</span>
                <span className="text-[10px] text-[var(--room-text-muted)] opacity-50">Muted</span>
              </div>
            )}

            {/* Mute toggle */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-black/80 z-10"
              title={muted ? "Unmute" : "Mute"}
            >
              <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {muted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M12 6.253v11.494m0 0l-4.707-4.707A1 1 0 007.586 13H6a1 1 0 01-1-1V8a1 1 0 011-1h1.586l4.707-4.707C12.923 1.663 14 2.109 14 3v14c0 .891-1.077 1.337-1.707.707L12 17.747z" />
                )}
              </svg>
            </button>
          </div>

          <p className="text-[9px] text-white/25 mt-1.5 text-center tracking-wider">
            STEVEN&apos;S PLAYLIST
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
