"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

type StepKey = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [step, setStep] = useState<StepKey>(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [reminderStyle, setReminderStyle] = useState<"aggressive" | "moderate" | "light">("moderate");
  const [saving, setSaving] = useState(false);

  const name = useMemo(() => user?.email ?? "Student", [user?.email]);
  void loading;

  return (
    <main className="min-h-screen px-4 py-10 bg-neutral-950 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2, 3].map((n) => {
            const active = n === step;
            return (
              <div key={n} className="flex items-center gap-2">
                <div
                  className={[
                    "h-3 w-3 rounded-full border",
                    active ? "bg-primary-blue border-primary-blue" : "bg-neutral-800/60 border-neutral-700"
                  ].join(" ")}
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-7 shadow-xl">
          {step === 1 ? (
            <section>
              <div className="text-sm text-neutral-400 font-semibold">Step 1 of 3</div>
              <h1 className="mt-2 text-2xl font-bold text-neutral-100">Welcome, {name}</h1>
              <p className="mt-3 text-sm text-neutral-400">
                Syllabify reads your syllabus, extracts assignments and deadlines, then helps you chat and track grades—all in one place.
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-6 w-full rounded-xl bg-primary-blue px-4 py-3 font-semibold text-white hover:brightness-110"
              >
                Get started
              </button>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <div className="text-sm text-neutral-400 font-semibold">Step 2 of 3</div>
              <h2 className="mt-2 text-xl font-bold text-neutral-100">Verify your phone number</h2>

              <label className="mt-4 block">
                <div className="text-sm font-semibold text-neutral-200 mb-1">Phone number</div>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 555 123 4567"
                  className="w-full rounded-xl bg-neutral-800/40 border border-neutral-700 px-4 py-3 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-primary-blue/25"
                />
              </label>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={verifying || !phoneNumber.trim()}
                  onClick={async () => {
                    setVerifying(true);
                    try {
                      // TODO: Wire to `app/api/verify-phone`.
                      await fetch("/api/verify-phone", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ phoneNumber })
                      });
                      setOtpSent(true);
                    } finally {
                      setVerifying(false);
                    }
                  }}
                  className="w-full rounded-xl bg-neutral-800/60 border border-neutral-700 px-4 py-3 font-semibold text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {verifying ? "Sending..." : "Send Code"}
                </button>
              </div>

              {otpSent ? (
                <div className="mt-4">
                  <label className="block">
                    <div className="text-sm font-semibold text-neutral-200 mb-1">OTP code</div>
                    <input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full rounded-xl bg-neutral-800/40 border border-neutral-700 px-4 py-3 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-primary-blue/25"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={verifying || otpCode.trim().length < 6}
                    onClick={async () => {
                      setVerifying(true);
                      try {
                        // TODO: Wire to `app/api/confirm-phone`.
                        await fetch("/api/confirm-phone", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phoneNumber, code: otpCode })
                        });
                        setStep(3);
                      } finally {
                        setVerifying(false);
                      }
                    }}
                    className="mt-4 w-full rounded-xl bg-primary-blue px-4 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {verifying ? "Verifying..." : "Verify"}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <div className="text-sm text-neutral-400 font-semibold">Step 3 of 3</div>
              <h2 className="mt-2 text-xl font-bold text-neutral-100">Reminder preferences</h2>
              <p className="mt-2 text-sm text-neutral-400">Pick how often Syllabify should remind you about upcoming deadlines.</p>

              <div className="mt-5 grid grid-cols-1 gap-3">
                {[
                  { key: "aggressive" as const, title: "Aggressive", detail: "7 days, 2 days, morning of" },
                  { key: "moderate" as const, title: "Moderate", detail: "3 days, morning of" },
                  { key: "light" as const, title: "Light", detail: "24 hours" }
                ].map((opt) => {
                  const selected = opt.key === reminderStyle;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setReminderStyle(opt.key)}
                      className={[
                        "text-left rounded-2xl p-4 border transition",
                        selected ? "border-primary-blue bg-primary-blue/10" : "border-neutral-800 bg-neutral-900/20"
                      ].join(" ")}
                    >
                      <div className="font-bold text-neutral-100">{opt.title}</div>
                      <div className="text-sm text-neutral-400">{opt.detail}</div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={saving || !reminderStyle}
                onClick={async () => {
                  setSaving(true);
                  try {
                    // TODO: Save to Firestore `users/{userId}`.
                    await Promise.resolve();
                    router.replace("/dashboard");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="mt-6 w-full rounded-xl bg-primary-blue px-4 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Continue to Dashboard"}
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

