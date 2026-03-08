"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface StageAudioProps {
  isHost: boolean;
  userName: string;
}

interface AudioParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isHost: boolean;
}

export default function StageAudio({ isHost, userName }: StageAudioProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [onStage, setOnStage] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [raisedHands, setRaisedHands] = useState<{ id: string; name: string }[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for visual feedback
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      setIsMicOn(true);

      // Add self to participants
      const selfParticipant: AudioParticipant = {
        id: "self",
        name: userName + (isHost ? " (Host)" : ""),
        isMuted: false,
        isHost,
      };
      setParticipants((prev) => [...prev.filter((p) => p.id !== "self"), selfParticipant]);

      // In production: Daily.co room.join() with mic enabled
      // daily.join({ url: roomUrl, token: meetingToken })
    } catch {
      // User denied mic
    }
  }, [userName, isHost]);

  const stopMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    setIsMicOn(false);
    setParticipants((prev) => prev.filter((p) => p.id !== "self"));
    // In production: daily.setLocalAudio(false)
  }, []);

  // Audio level meter
  useEffect(() => {
    if (!analyserRef.current || !isMicOn) return;
    let rafId: number;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    function tick() {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(avg / 255);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isMicOn]);

  // Demo: simulate raised hands from audience
  useEffect(() => {
    if (!isHost) return;
    const names = ["Sarah M.", "James K.", "Alex T.", "Priya R."];
    const timer = setTimeout(() => {
      setRaisedHands([
        { id: "demo-1", name: names[Math.floor(Math.random() * names.length)] },
      ]);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isHost]);

  const inviteOnStage = useCallback(
    (handId: string, handName: string) => {
      // In production: Daily.co updateParticipant() to grant speaker permissions
      setRaisedHands((prev) => prev.filter((h) => h.id !== handId));
      setParticipants((prev) => [
        ...prev,
        { id: handId, name: handName, isMuted: false, isHost: false },
      ]);
    },
    []
  );

  const removeFromStage = useCallback((participantId: string) => {
    // In production: Daily.co updateParticipant() to revoke speaker permissions
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setShowPanel((p) => !p)}
        className="absolute top-14 left-4 z-30 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm hover:border-[var(--doac-orange)]/50 transition-all cursor-pointer flex items-center gap-2"
      >
        {isMicOn && (
          <span
            className="w-2 h-2 rounded-full bg-green-400"
            style={{ boxShadow: `0 0 ${audioLevel * 12}px ${audioLevel * 6}px rgba(74, 222, 128, ${audioLevel})` }}
          />
        )}
        {showPanel ? "Close" : "Stage"}
      </button>

      {showPanel && (
        <div className="absolute top-24 left-4 z-30 w-80 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-1 tracking-wide uppercase">
            Stage Audio
          </h3>
          <p className="text-xs text-white/40 mb-4">
            {isHost
              ? "You're a host. You can broadcast your mic and invite audience members on stage."
              : "Raise your hand to request stage access from the host."}
          </p>

          {/* ── HOST CONTROLS ── */}
          {isHost && (
            <>
              {/* Mic toggle */}
              <div className="mb-4">
                {!isMicOn ? (
                  <button
                    onClick={startMic}
                    className="w-full py-2.5 rounded-lg bg-[var(--doac-orange)]/20 border border-[var(--doac-orange)]/30 text-sm text-[var(--doac-orange)] hover:bg-[var(--doac-orange)]/30 transition-all cursor-pointer"
                  >
                    Go Live — Enable Mic
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full bg-green-400"
                          style={{
                            boxShadow: `0 0 ${audioLevel * 16}px ${audioLevel * 8}px rgba(74, 222, 128, ${audioLevel * 0.6})`,
                          }}
                        />
                        <span className="text-sm text-white">Mic Live</span>
                      </div>
                      <button
                        onClick={stopMic}
                        className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-300 hover:bg-red-500/30 transition-all cursor-pointer"
                      >
                        Mute
                      </button>
                    </div>
                    {/* Audio level bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all duration-75"
                        style={{ width: `${audioLevel * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Raised hands */}
              {raisedHands.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">
                    Raised Hands
                  </p>
                  {raisedHands.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-2"
                    >
                      <span className="text-sm text-white">
                        <span className="mr-2">&#9995;</span>
                        {h.name}
                      </span>
                      <button
                        onClick={() => inviteOnStage(h.id, h.name)}
                        className="px-3 py-1 rounded-lg bg-[var(--doac-orange)]/20 border border-[var(--doac-orange)]/30 text-xs text-[var(--doac-orange)] hover:bg-[var(--doac-orange)]/30 transition-all cursor-pointer"
                      >
                        Invite on Stage
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* On-stage participants */}
              {participants.length > 0 && (
                <div>
                  <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">
                    On Stage
                  </p>
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-sm text-white">{p.name}</span>
                      </div>
                      {p.id !== "self" && (
                        <button
                          onClick={() => removeFromStage(p.id)}
                          className="px-2 py-1 rounded bg-red-500/20 text-xs text-red-300 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── AUDIENCE CONTROLS ── */}
          {!isHost && (
            <>
              {!onStage ? (
                <div>
                  {!handRaised ? (
                    <button
                      onClick={() => {
                        setHandRaised(true);
                        // In production: emit "raise-hand" via Socket.io / Daily.co
                      }}
                      className="w-full py-2.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-sm text-yellow-300 hover:bg-yellow-500/30 transition-all cursor-pointer"
                    >
                      &#9995; Raise Hand to Speak
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-2">
                        <span className="text-2xl animate-bounce inline-block">&#9995;</span>
                        <p className="text-sm text-yellow-300 mt-1">Hand Raised</p>
                        <p className="text-xs text-white/40">Waiting for host to invite you...</p>
                      </div>
                      <button
                        onClick={() => setHandRaised(false)}
                        className="text-xs text-white/40 hover:text-white/60 cursor-pointer"
                      >
                        Lower Hand
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm text-green-300 font-medium">You&apos;re on stage!</span>
                    </div>
                    <p className="text-xs text-white/40">Your mic is broadcasting to all viewers.</p>
                  </div>
                  {!isMicOn ? (
                    <button
                      onClick={startMic}
                      className="w-full py-2.5 rounded-lg bg-green-500/20 border border-green-500/30 text-sm text-green-300 hover:bg-green-500/30 transition-all cursor-pointer"
                    >
                      Enable Mic
                    </button>
                  ) : (
                    <button
                      onClick={stopMic}
                      className="w-full py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-sm text-red-300 hover:bg-red-500/30 transition-all cursor-pointer"
                    >
                      Mute Mic
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Production note */}
          <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5">
            <p className="text-xs text-white/25">
              <span className="text-[var(--doac-orange)]/50 font-semibold">Production:</span>{" "}
              Uses Daily.co for WebRTC audio distribution. Hosts broadcast mic to all.
              Audience can raise hand; host invites them on stage (Daily.co
              participant permissions). Low latency, scales to 1000+ viewers.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
