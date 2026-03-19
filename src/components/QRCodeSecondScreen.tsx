"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isVisible: boolean;
  appUrl?: string;
}

export default function QRCodeSecondScreen({ isVisible, appUrl }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const mobileUrl = `${appUrl || (typeof window !== "undefined" ? window.location.origin : "")}/mobile`;

  // Auto-dismiss after 30s
  useEffect(() => {
    if (!isVisible || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 30000);
    return () => clearTimeout(timer);
  }, [isVisible, dismissed]);

  if (dismissed || !isVisible) return null;

  // Generate QR code URL via a public API (no dependency needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(mobileUrl)}&bgcolor=0a0a0a&color=e8e8f0&format=svg`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 right-6 z-[20]"
      >
        <div
          className="rounded-xl border border-white/10 p-4 text-center"
          style={{
            background: "rgba(10,10,15,0.9)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Scan to open second screen"
            className="w-24 h-24 mx-auto rounded-lg"
            style={{ imageRendering: "pixelated" }}
          />
          <p className="text-xs text-white/70 mt-2 font-medium">Scan with phone</p>
          <p className="text-[9px] text-white/30 mt-0.5">Chat, react, play games</p>

          <button
            onClick={() => setDismissed(true)}
            className="mt-2 text-[9px] text-white/20 hover:text-white/50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
