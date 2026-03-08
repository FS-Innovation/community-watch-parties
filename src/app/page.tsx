import Link from "next/link";
import ThresholdCounter from "@/components/ThresholdCounter";
import RegistrationForm from "@/components/RegistrationForm";

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(232,115,74,0.08) 0%, transparent 60%)",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(232,115,74,0.04) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <p className="text-sm tracking-[0.3em] uppercase text-[var(--doac-orange)] font-medium mb-4">
            The Diary of a CEO
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Watch Party
          </h1>
          <p className="text-lg text-[var(--doac-text-muted)] max-w-md mx-auto leading-relaxed">
            A cinematic screening experience. Watch together. React together.
            Connect together.
          </p>
        </div>

        {/* Threshold counter */}
        <div className="mb-10">
          <ThresholdCounter />
        </div>

        {/* Registration form */}
        <RegistrationForm />

        {/* Demo shortcut — skip straight to watch room */}
        <div className="text-center mt-8 animate-fade-in-delay-2">
          <Link
            href="/watch/demo"
            className="text-sm text-[var(--doac-text-muted)] hover:text-[var(--doac-orange)] transition-colors underline underline-offset-4"
          >
            Skip to watch room preview
          </Link>
        </div>
      </div>
    </main>
  );
}
