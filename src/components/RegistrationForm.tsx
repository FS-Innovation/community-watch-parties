"use client";

import { useState } from "react";

const LIFE_STAGES = [
  "Student",
  "Early Career",
  "Building a Business",
  "Established Professional",
  "Career Pivot",
  "Creative / Freelance",
  "Retired / Exploring",
  "Prefer not to say",
];

export default function RegistrationForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    life_stage: "",
    building: "",
    question_for_steven: "",
    location: "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }

  if (status === "success") {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center animate-fade-in max-w-lg mx-auto">
        <div className="text-4xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold mb-2">You&apos;re in.</h2>
        <p className="text-[var(--doac-text-muted)]">
          Check your email for your unique access link. See you at the
          screening.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-lg bg-[var(--doac-dark)] border border-[var(--doac-border)] text-[var(--doac-text)] placeholder:text-[var(--doac-text-muted)] focus:outline-none focus:border-[var(--doac-orange)] focus:ring-1 focus:ring-[var(--doac-orange)] transition-colors";

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel rounded-2xl p-8 space-y-5 max-w-lg mx-auto animate-fade-in-delay-2"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Your name"
          value={formData.name}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="life_stage"
          className="block text-sm font-medium mb-1.5"
        >
          Where are you in life right now?
        </label>
        <select
          id="life_stage"
          name="life_stage"
          required
          value={formData.life_stage}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="" disabled>
            Select your life stage
          </option>
          {LIFE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="building" className="block text-sm font-medium mb-1.5">
          What are you building?
        </label>
        <textarea
          id="building"
          name="building"
          required
          rows={2}
          placeholder="A business, a skill, a new chapter..."
          value={formData.building}
          onChange={handleChange}
          className={inputClass + " resize-none"}
        />
      </div>

      <div>
        <label
          htmlFor="question_for_steven"
          className="block text-sm font-medium mb-1.5"
        >
          One question for Steven
        </label>
        <textarea
          id="question_for_steven"
          name="question_for_steven"
          required
          rows={2}
          placeholder="If you had 30 seconds with Steven, what would you ask?"
          value={formData.question_for_steven}
          onChange={handleChange}
          className={inputClass + " resize-none"}
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium mb-1.5">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          placeholder="City, Country"
          value={formData.location}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {status === "error" && (
        <p className="text-red-400 text-sm text-center">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3.5 rounded-lg font-semibold text-white bg-[var(--doac-orange)] hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {status === "submitting" ? "Claiming your spot..." : "Claim Your Spot"}
      </button>

      <p className="text-xs text-center text-[var(--doac-text-muted)]">
        By registering you agree to our privacy policy. Your data is stored
        securely and never shared with third parties.
      </p>
    </form>
  );
}
