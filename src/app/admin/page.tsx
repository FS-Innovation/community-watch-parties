"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface EventData {
  id: string;
  title: string;
  status: string;
  threshold: number;
  screening_date: string | null;
  mux_playback_id: string | null;
  registered: number;
}

interface RegistrantRow {
  id: string;
  first_name: string;
  email: string;
  city: string;
  screen_choice: string;
  ticket_number: number;
  seat_code: string;
  status: string;
  created_at: string;
}

interface SegmentStat {
  segment: string;
  count: number;
}

interface RoomRow {
  id: string;
  name: string;
  screen_label: string;
  current_count: number;
  min_threshold: number;
  status: string;
}

type Tab = "overview" | "registrants" | "segments" | "rooms" | "event";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [event, setEvent] = useState<EventData | null>(null);
  const [registrants, setRegistrants] = useState<RegistrantRow[]>([]);
  const [segments, setSegments] = useState<SegmentStat[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Event form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventStatus, setEventStatus] = useState("registration");
  const [eventDate, setEventDate] = useState("");
  const [muxPlaybackId, setMuxPlaybackId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventRes, regRes, segRes, roomRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/admin/registrants"),
        fetch("/api/admin/segments"),
        fetch("/api/admin/rooms"),
      ]);

      const eventData = await eventRes.json();
      const regData = await regRes.json();
      const segData = await segRes.json();
      const roomData = await roomRes.json();

      if (eventData.event) {
        setEvent(eventData.event);
        setEventTitle(eventData.event.title);
        setEventStatus(eventData.event.status);
        setEventDate(eventData.event.screening_date || "");
        setMuxPlaybackId(eventData.event.mux_playback_id || "");
      }
      setRegistrants(regData.registrants || []);
      setSegments(segData.segments || []);
      setRooms(roomData.rooms || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveEvent = async () => {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: event?.id,
        title: eventTitle,
        status: eventStatus,
        screening_date: eventDate || null,
        mux_playback_id: muxPlaybackId || null,
      }),
    });
    loadData();
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "City", "Screen", "Ticket", "Seat", "Status", "Registered"];
    const rows = registrants.map((r) => [
      r.first_name, r.email, r.city, r.screen_choice,
      r.ticket_number, r.seat_code, r.status, r.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "registrants", label: "Registrants" },
    { key: "segments", label: "Segments" },
    { key: "rooms", label: "Rooms" },
    { key: "event", label: "Event Control" },
  ];

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--cwp-gold)] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-[var(--cwp-text-muted)]">
              {event?.title || "No active event"} &middot; {event?.status || "—"}
            </p>
          </div>
          <button onClick={loadData} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[var(--cwp-border-subtle)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "border-[var(--cwp-gold)] text-[var(--cwp-gold)]"
                  : "border-transparent text-[var(--cwp-text-muted)] hover:text-[var(--cwp-text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Overview Tab ─── */}
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="admin-card">
                <div className="admin-stat">
                  <div className="admin-stat-value">{event?.registered || 0}</div>
                  <div className="admin-stat-label">Registered</div>
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat">
                  <div className="admin-stat-value">{event?.threshold || 1000}</div>
                  <div className="admin-stat-label">Threshold</div>
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat">
                  <div className="admin-stat-value">{rooms.length}</div>
                  <div className="admin-stat-label">Rooms</div>
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-stat">
                  <div className="admin-stat-value">
                    {event && event.threshold > 0
                      ? Math.round(((event.registered || 0) / event.threshold) * 100)
                      : 0}%
                  </div>
                  <div className="admin-stat-label">To Threshold</div>
                </div>
              </div>
            </div>

            {/* Threshold progress */}
            <div className="admin-card mb-8">
              <h3 className="text-sm font-medium mb-3">Registration Progress</h3>
              <div className="threshold-bar h-3 rounded">
                <div
                  className="threshold-fill h-full rounded"
                  style={{
                    width: `${Math.min(100, ((event?.registered || 0) / (event?.threshold || 1000)) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[var(--cwp-text-muted)] mt-2">
                {event?.registered || 0} / {event?.threshold || 1000} registrations.
                {(event?.registered || 0) >= (event?.threshold || 1000)
                  ? " Threshold met — event confirmed!"
                  : ` ${(event?.threshold || 1000) - (event?.registered || 0)} more needed.`}
              </p>
            </div>

            {/* Segment breakdown */}
            <div className="admin-card">
              <h3 className="text-sm font-medium mb-3">Segment Breakdown</h3>
              <div className="space-y-2">
                {segments.map((s) => (
                  <div key={s.segment} className="flex items-center gap-3">
                    <span className="text-sm capitalize flex-1">{s.segment}</span>
                    <span className="text-sm text-[var(--cwp-gold)] font-medium">{s.count}</span>
                    <div className="w-32 h-2 bg-[var(--cwp-surface)] rounded overflow-hidden">
                      <div
                        className="h-full bg-[var(--cwp-gold)] rounded"
                        style={{ width: `${(s.count / Math.max(1, event?.registered || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Registrants Tab ─── */}
        {tab === "registrants" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between mb-4">
              <p className="text-sm text-[var(--cwp-text-muted)]">{registrants.length} registrants</p>
              <button onClick={exportCSV} className="btn-secondary text-sm">
                Export CSV
              </button>
            </div>
            <div className="admin-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--cwp-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--cwp-border-subtle)]">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">City</th>
                    <th className="pb-3 pr-4">Screen</th>
                    <th className="pb-3 pr-4">Seat</th>
                    <th className="pb-3">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {registrants.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--cwp-border-subtle)] hover:bg-[var(--cwp-surface)]">
                      <td className="py-2 pr-4 text-[var(--cwp-text-muted)]">{r.ticket_number}</td>
                      <td className="py-2 pr-4 font-medium">{r.first_name}</td>
                      <td className="py-2 pr-4 text-[var(--cwp-text-secondary)]">{r.email}</td>
                      <td className="py-2 pr-4 text-[var(--cwp-text-secondary)]">{r.city}</td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--cwp-surface-hover)]">
                          {r.screen_choice}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-[var(--cwp-gold)]">{r.seat_code}</td>
                      <td className="py-2 text-[var(--cwp-text-muted)] text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ─── Segments Tab ─── */}
        {tab === "segments" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 gap-4">
              {segments.map((s) => (
                <div key={s.segment} className="admin-card">
                  <div className="admin-stat">
                    <div className="admin-stat-value">{s.count}</div>
                    <div className="admin-stat-label capitalize">{s.segment}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Rooms Tab ─── */}
        {tab === "rooms" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-3">
              {rooms.map((r) => (
                <div key={r.id} className="admin-card flex items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{r.name}</h4>
                    <p className="text-xs text-[var(--cwp-text-muted)]">{r.screen_label}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[var(--cwp-gold)]">{r.current_count}</p>
                    <p className="text-xs text-[var(--cwp-text-muted)]">/ {r.min_threshold} min</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      r.status === "open"
                        ? "bg-green-500/15 text-green-400"
                        : r.status === "filling"
                        ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-[var(--cwp-surface)] text-[var(--cwp-text-muted)]"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
              {rooms.length === 0 && (
                <p className="text-sm text-[var(--cwp-text-muted)]">No rooms created yet. Rooms are auto-created as people register.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Event Control Tab ─── */}
        {tab === "event" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="admin-card max-w-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1">Event Title</label>
                <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1">Status</label>
                <select value={eventStatus} onChange={(e) => setEventStatus(e.target.value)} className="input-field">
                  <option value="draft">Draft</option>
                  <option value="registration">Registration Open</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1">Screening Date</label>
                <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cwp-text-secondary)] mb-1">Mux Playback ID</label>
                <input value={muxPlaybackId} onChange={(e) => setMuxPlaybackId(e.target.value)} className="input-field" placeholder="e.g. abc123xyz" />
              </div>
              <button onClick={saveEvent} className="btn-primary">
                {event?.id ? "Update Event" : "Create Event"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
