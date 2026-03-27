"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

/* ─────────────────────────────────────────────
   Tiny reusable primitives
───────────────────────────────────────────── */

function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-[#4ADE80] via-[#7DD3FC] to-[#4ADE80] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient ${className}`}
    >
      {children}
    </span>
  );
}

function GlowOrb({ className }: { className: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
  );
}

function FeatureCard({
  icon, title, description, accent,
}: {
  icon: React.ReactNode; title: string; description: string; accent: "green" | "blue";
}) {
  const border = accent === "green" ? "border-[#4ADE80]/20 hover:border-[#4ADE80]/50" : "border-[#7DD3FC]/20 hover:border-[#7DD3FC]/50";
  const iconBg = accent === "green" ? "bg-[#4ADE80]/10 text-[#4ADE80]" : "bg-[#7DD3FC]/10 text-[#7DD3FC]";
  return (
    <div className={`group relative rounded-2xl border bg-[#111111] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${border}`}>
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      <h3 className="mb-2 text-base font-semibold text-[#F9FAFB]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#9CA3AF]">{description}</p>
    </div>
  );
}

function StepBadge({ n, accent }: { n: number; accent: "green" | "blue" }) {
  const bg = accent === "green" ? "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30" : "bg-[#7DD3FC]/10 text-[#7DD3FC] border-[#7DD3FC]/30";
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${bg}`}>{n}</span>
  );
}

/* ─────────────────────────────────────────────
   Inline SVG icons
───────────────────────────────────────────── */
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const IconSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

/* ─────────────────────────────────────────────
   Animated typing headline
───────────────────────────────────────────── */
const HEADLINES = [
  "Understand your syllabus.",
  "Track every deadline.",
  "Predict your final grade.",
  "Ask anything about class.",
];

function TypingHeadline() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      const t = setTimeout(() => { setPaused(false); setDeleting(true); }, 1800);
      return () => clearTimeout(t);
    }
    const target = HEADLINES[idx];
    if (!deleting) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 45);
        return () => clearTimeout(t);
      } else {
        setPaused(true);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 22);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setIdx((i) => (i + 1) % HEADLINES.length);
      }
    }
  }, [displayed, deleting, paused, idx]);

  return (
    <span>
      <GradientText>{displayed}</GradientText>
      <span className="ml-0.5 inline-block w-[2px] h-[1em] align-middle bg-[#4ADE80] animate-blink" />
    </span>
  );
}

/* ─────────────────────────────────────────────
   Mock dashboard UI preview
───────────────────────────────────────────── */
function MockDashboard() {
  const courses = [
    { name: "CS 4780 · Machine Learning", next: "HW 3 due in 2 days", pct: 88, accent: "#4ADE80" },
    { name: "MATH 3110 · Real Analysis", next: "Midterm in 5 days", pct: 74, accent: "#7DD3FC" },
    { name: "ECON 3030 · Econometrics", next: "Problem Set 4 due in 1 week", pct: 91, accent: "#4ADE80" },
  ];
  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#4ADE80]" />
          <span className="text-xs font-semibold text-[#4ADE80]">Syllabify</span>
        </div>
        <span className="text-[11px] text-[#4B5563]">Fall 2025</span>
      </div>
      <div className="space-y-3">
        {courses.map((c) => (
          <div key={c.name} className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-[#F9FAFB] leading-snug">{c.name}</span>
              <span className="text-xs font-bold" style={{ color: c.accent }}>{c.pct}%</span>
            </div>
            <div className="mb-2 h-1.5 w-full rounded-full bg-[#1F1F1F] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.accent }} />
            </div>
            <p className="text-[11px] text-[#9CA3AF]">{c.next}</p>
          </div>
        ))}
      </div>
      {/* Floating AI chat bubble */}
      <div className="absolute -right-4 -bottom-4 w-44 rounded-xl border border-[#7DD3FC]/30 bg-[#082f49]/80 px-3 py-2 shadow-xl backdrop-blur-sm">
        <p className="text-[10px] text-[#7DD3FC] font-medium mb-1">AI Assistant</p>
        <p className="text-[10px] text-[#9CA3AF] leading-snug">&ldquo;What&apos;s worth the most in MATH 3110?&rdquo;</p>
        <div className="mt-1.5 h-px bg-[#7DD3FC]/20" />
        <p className="mt-1 text-[10px] text-[#F9FAFB] leading-snug">Midterm 30%, Final 40%, HW 30%</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main landing page
───────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin" />
      </main>
    );
  }
  if (user) return null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F9FAFB] overflow-x-hidden">
      <style>{`
        @keyframes gradient{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .animate-gradient{animation:gradient 4s linear infinite;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .animate-blink{animation:blink 1s step-end infinite;}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        .animate-float{animation:float 5s ease-in-out infinite;}
      `}</style>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#1F1F1F]/80 bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#4ADE80]" />
            <span className="text-sm font-bold tracking-tight">Syllabify</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#F9FAFB]">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#4ADE80] px-4 py-1.5 text-sm font-semibold text-[#0A0A0A] transition-all hover:bg-[#86efac] active:scale-95"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-20 text-center">
        <GlowOrb className="left-1/4 top-1/4 h-96 w-96 bg-[#4ADE80]" />
        <GlowOrb className="right-1/4 bottom-1/3 h-80 w-80 bg-[#7DD3FC]" />

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/5 px-4 py-1.5 text-xs font-medium text-[#4ADE80]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          Powered by Gemini AI
        </div>

        <h1 className="mb-4 max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          <TypingHeadline />
        </h1>

        <p className="mb-10 max-w-xl text-base leading-relaxed text-[#9CA3AF] sm:text-lg">
          Drop in your PDF syllabus. Syllabify extracts every deadline, calculates your grade, and
          lets you chat with an AI that actually knows your course.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="group flex items-center gap-2 rounded-xl bg-[#4ADE80] px-7 py-3 text-sm font-bold text-[#0A0A0A] shadow-lg shadow-[#4ADE80]/20 transition-all hover:bg-[#86efac] hover:shadow-[#4ADE80]/30 active:scale-95"
          >
            Start for free
            <span className="transition-transform group-hover:translate-x-0.5"><IconArrow /></span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[#1F1F1F] bg-[#111111] px-7 py-3 text-sm font-semibold text-[#F9FAFB] transition-all hover:border-[#4ADE80]/30 hover:bg-[#1a1a1a] active:scale-95"
          >
            Sign in
          </Link>
        </div>

        <div className="relative mt-20 animate-float">
          <MockDashboard />
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <span className="text-[10px] uppercase tracking-widest text-[#9CA3AF]">scroll</span>
          <div className="h-8 w-px bg-gradient-to-b from-[#9CA3AF] to-transparent" />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative px-6 py-24">
        <GlowOrb className="left-0 top-1/2 h-72 w-72 bg-[#4ADE80]" />
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#4ADE80]">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From PDF to <GradientText>insights in seconds</GradientText>
            </h2>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { step: 1, accent: "green" as const, icon: <IconUpload />, title: "Upload your syllabus", desc: "Drag and drop any PDF. Syllabify ingests it instantly — no copy-paste required." },
              { step: 2, accent: "blue" as const, icon: <IconSparkles />, title: "AI extracts everything", desc: "Gemini reads every page and pulls out assignments, due dates, and grading weights automatically." },
              { step: 3, accent: "green" as const, icon: <IconChart />, title: "Track & plan", desc: "See your live grade, run what-if scenarios, and chat with your AI course assistant anytime." },
            ].map(({ step, accent, icon, title, desc }) => (
              <div key={step} className="flex flex-col items-start gap-4">
                <StepBadge n={step} accent={accent} />
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent === "green" ? "bg-[#4ADE80]/10 text-[#4ADE80]" : "bg-[#7DD3FC]/10 text-[#7DD3FC]"}`}>
                  {icon}
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-[#F9FAFB]">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#9CA3AF]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="relative px-6 py-24">
        <GlowOrb className="right-0 top-1/3 h-72 w-72 bg-[#7DD3FC]" />
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#7DD3FC]">Features</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to <GradientText>ace the semester</GradientText>
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard accent="green" icon={<IconUpload />} title="PDF Syllabus Parsing" description="Upload once. Gemini AI extracts assignments, due dates, grading policies, and office hours — no manual entry." />
            <FeatureCard accent="blue" icon={<IconChart />} title="Live Grade Calculator" description="Enter your scores and watch your running grade update in real time. Weighted categories handled automatically." />
            <FeatureCard accent="green" icon={<IconSparkles />} title="What-if Projections" description="Set a target grade and see exactly what you need on upcoming assignments to hit it." />
            <FeatureCard accent="blue" icon={<IconChat />} title="AI Course Assistant" description="Ask anything — policy questions, concepts, deadlines — and get answers grounded in your actual syllabus." />
            <FeatureCard accent="green" icon={<IconBell />} title="Deadline Tracking" description="Every assignment automatically surfaced on a clean timeline so you always know what&apos;s coming next." />
            <FeatureCard accent="blue" icon={<IconShield />} title="Secure & Private" description="Firebase Auth and Firestore rules ensure only you can access your syllabi and grades. Nothing shared." />
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-y border-[#1F1F1F] bg-[#111111] px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-[#4B5563]">
            Built for students at every university
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { quote: "I uploaded my syllabus and instantly saw every deadline. Saved me hours of calendar work.", name: "Aisha K.", school: "Cornell University" },
              { quote: "The grade calculator with what-if is genuinely the best tool I&apos;ve used all semester.", name: "Marcus T.", school: "UC Berkeley" },
              { quote: "Asking the AI about my final exam breakdown felt like having a TA on demand.", name: "Sofia R.", school: "UT Austin" },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
                <p className="mb-4 text-sm leading-relaxed text-[#9CA3AF]">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm font-semibold text-[#F9FAFB]">{t.name}</p>
                <p className="text-xs text-[#4B5563]">{t.school}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative px-6 py-24">
        <GlowOrb className="left-1/2 -translate-x-1/2 top-1/4 h-80 w-80 bg-[#4ADE80]" />
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#4ADE80]">Pricing</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, <GradientText>student-friendly</GradientText> pricing
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Free tier */}
            <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-7">
              <p className="mb-1 text-sm font-semibold text-[#9CA3AF]">Free</p>
              <p className="mb-4 text-4xl font-bold text-[#F9FAFB]">$0<span className="text-base font-normal text-[#4B5563]">/mo</span></p>
              <ul className="mb-6 space-y-2.5">
                {["3 courses", "AI extraction", "Grade calculator", "Deadline timeline"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                    <span className="text-[#4ADE80]"><IconCheck /></span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block rounded-xl border border-[#1F1F1F] py-2.5 text-center text-sm font-semibold text-[#F9FAFB] transition-all hover:border-[#4ADE80]/40 hover:bg-[#4ADE80]/5">
                Get started free
              </Link>
            </div>
            {/* Pro tier */}
            <div className="relative rounded-2xl border border-[#4ADE80]/40 bg-[#111111] p-7 shadow-lg shadow-[#4ADE80]/5">
              <div className="absolute -top-3 right-5 rounded-full bg-[#4ADE80] px-3 py-0.5 text-[10px] font-bold text-[#0A0A0A]">POPULAR</div>
              <p className="mb-1 text-sm font-semibold text-[#4ADE80]">Pro</p>
              <p className="mb-4 text-4xl font-bold text-[#F9FAFB]">$4<span className="text-base font-normal text-[#4B5563]">/mo</span></p>
              <ul className="mb-6 space-y-2.5">
                {["Unlimited courses", "AI extraction", "Grade calculator", "Deadline timeline", "AI course chat (RAG)", "What-if grade planner"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                    <span className="text-[#4ADE80]"><IconCheck /></span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block rounded-xl bg-[#4ADE80] py-2.5 text-center text-sm font-bold text-[#0A0A0A] transition-all hover:bg-[#86efac] active:scale-95">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden border-t border-[#1F1F1F] px-6 py-28 text-center">
        <GlowOrb className="left-1/4 top-0 h-72 w-72 bg-[#4ADE80]" />
        <GlowOrb className="right-1/4 bottom-0 h-64 w-64 bg-[#7DD3FC]" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Stop guessing your grade.{" "}
            <GradientText>Start knowing it.</GradientText>
          </h2>
          <p className="mb-10 text-base text-[#9CA3AF]">
            Upload your first syllabus in under 30 seconds — free, no credit card required.
          </p>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#4ADE80] px-9 py-3.5 text-base font-bold text-[#0A0A0A] shadow-xl shadow-[#4ADE80]/20 transition-all hover:bg-[#86efac] hover:shadow-[#4ADE80]/30 active:scale-95"
          >
            Get started — it&apos;s free
            <span className="transition-transform group-hover:translate-x-0.5"><IconArrow /></span>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1F1F1F] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            <span className="text-sm font-semibold">Syllabify</span>
          </div>
          <p className="text-xs text-[#4B5563]">© {new Date().getFullYear()} Syllabify. Built for students, by students.</p>
          <div className="flex items-center gap-5 text-xs text-[#4B5563]">
            <Link href="/login" className="hover:text-[#9CA3AF] transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-[#9CA3AF] transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

