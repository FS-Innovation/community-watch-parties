"use client";

import { useState } from "react";
import InviteLanding from "@/components/InviteLanding";
import ScreenPicker from "@/components/ScreenPicker";
import RegistrationForm from "@/components/RegistrationForm";
import CinemaTicket from "@/components/CinemaTicket";
import RoomAssignment from "@/components/RoomAssignment";
import type { Screen, Registration, Room } from "@/lib/types";

type Step = "invite" | "screens" | "register" | "ticket" | "room";

export default function HomePage() {
  const [step, setStep] = useState<Step>("invite");
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [assignedRoom, setAssignedRoom] = useState<Room | null>(null);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background ambient gradients */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(212,168,83,0.06) 0%, transparent 50%)",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 70% 100%, rgba(139,92,246,0.04) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10">
        {step === "invite" && (
          <InviteLanding onContinue={() => setStep("screens")} />
        )}

        {step === "screens" && (
          <ScreenPicker
            onSelect={(screen) => {
              setSelectedScreen(screen);
              setStep("register");
            }}
          />
        )}

        {step === "register" && selectedScreen && (
          <RegistrationForm
            screen={selectedScreen}
            onComplete={(reg, room) => {
              setRegistration(reg);
              setAssignedRoom(room || null);
              setStep("ticket");
            }}
            onBack={() => setStep("screens")}
          />
        )}

        {step === "ticket" && registration && (
          <CinemaTicket
            registration={registration}
            screenName={selectedScreen?.name || ""}
            onContinue={() => setStep("room")}
          />
        )}

        {step === "room" && registration && (
          <RoomAssignment
            registration={registration}
            room={assignedRoom}
          />
        )}
      </div>
    </main>
  );
}
