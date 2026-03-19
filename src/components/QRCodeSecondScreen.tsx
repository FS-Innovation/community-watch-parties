"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { buildMagicLink } from "@/lib/magic-link";

interface Props {
  isVisible: boolean;
  viewerId: string;
  displayName: string;
  eventId: string;
  connectionRoom?: string;
}

export default function QRCodeSecondScreen({
  isVisible,
  viewerId,
  displayName,
  eventId,
  connectionRoom,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [magicUrl, setMagicUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const generateAttempted = useRef(false);

  // Generate QR code locally — no external API
  useEffect(() => {
    if (!isVisible || !viewerId || generateAttempted.current) return;
    generateAttempted.current = true;

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildMagicLink(baseUrl, viewerId, displayName, eventId, connectionRoom);
    setMagicUrl(url);

    QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: {
        dark: "#e8e8f0",
        light: "#0a0a10",
      },
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => {
        // Fallback: just show the link
        setQrDataUrl(null);
      });
  }, [isVisible, viewerId, displayName, eventId, connectionRoom]);

  // Re-generate when viewer name changes
  useEffect(() => {
    if (!isVisible || !viewerId) return;

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildMagicLink(baseUrl, viewerId, displayName, eventId, connectionRoom);
    setMagicUrl(url);

    QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: { dark: "#e8e8f0", light: "#0a0a10" },
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => {});
  }, [isVisible, viewerId, displayName, eventId, connectionRoom]);

  // Auto-dismiss after 45s
  useEffect(() => {
    if (!isVisible || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 45000);
    return () => clearTimeout(timer);
  }, [isVisible, dismissed]);

  const copyLink = () => {
    navigator.clipboard.writeText(magicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (dismissed || !isVisible) return null;

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
            background: "rgba(10,10,15,0.92)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          }}
        >
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrDataUrl}
              alt="Scan to open second screen"
              className="w-28 h-28 mx-auto rounded-lg"
            />
          ) : (
            <div className="w-28 h-28 mx-auto rounded-lg bg-white/5 flex items-center justify-center">
              <span className="text-3xl">📱</span>
            </div>
          )}

          <p className="text-xs text-white/70 mt-2.5 font-medium">
            Scan with your phone
          </p>
          <p className="text-[9px] text-white/30 mt-0.5 max-w-[160px]">
            Your identity carries over — chat, react, and play on your phone
          </p>

          {/* Copy link button */}
          <button
            onClick={copyLink}
            className="mt-2.5 text-[10px] text-white/40 hover:text-white/70 transition-colors px-3 py-1 rounded-md border border-white/10 hover:border-white/20"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>

          <br />
          <button
            onClick={() => setDismissed(true)}
            className="mt-1.5 text-[9px] text-white/15 hover:text-white/40 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
