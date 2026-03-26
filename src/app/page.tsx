"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoIcon } from "@/components/Logo";
import Footer from "@/components/Footer";

const features = [
  {
    title: "Eisenhower Task Matrix",
    desc: "Prioritise tasks with the Urgent-Important matrix",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    gradient: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/20",
    details: [
      "4-quadrant Eisenhower Matrix: Do First, Schedule, Delegate, Eliminate",
      "Auto-calculates urgency from due dates with configurable cutoff",
      "Categories: School, Private, Business, Family, Friends with colour codes",
      "Sub-tasks with progress tracking and celebration confetti",
      "Drag-and-drop between quadrants to change importance",
      "Email reminders with smart scheduling",
      "Recurring tasks: daily, weekly, fortnightly, monthly",
    ],
  },
  {
    title: "Goals Whiteboard",
    desc: "Set goals and see your task matrix side by side",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/20",
    details: [
      "Personal goal whiteboard — add, tick off, edit, and remove goals",
      "Show/hide completed goals to keep your board clean",
      "Task Priority Matrix view below your goals for context",
      "Drag tasks between importance quadrants right from the goals page",
      "Track goal completion rate with visual counter",
    ],
  },
  {
    title: "Weekly Time Plan",
    desc: "Plan your study week with a drag-and-drop timetable",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    gradient: "from-violet-500 to-purple-500",
    glow: "shadow-violet-500/20",
    details: [
      "Full 7-day weekly timetable from 6 AM to 9 PM",
      "Drag tasks from sidebar into 30-minute time slots",
      "Task boxes show pomodoro dots to track planned vs completed blocks",
      "Recurring weekly commitments (e.g. 'Math class every Tuesday')",
      "Navigate between weeks with arrows",
      "Desktop shows full week, mobile shows 3 days with scroll",
    ],
  },
  {
    title: "Pomodoro Timer",
    desc: "Immersive focus sessions with ambient sounds and animations",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    gradient: "from-red-500 to-orange-500",
    glow: "shadow-red-500/20",
    details: [
      "Editable work/break/long break timer durations",
      "Link sessions to specific tasks for automatic progress tracking",
      "6 animated visual scenes: Snow, Rain, Wind, Zen, Fire, Cafe",
      "Ambient sounds: rain, waves, forest birds, zen bell, cafe, fireplace",
      "Volume control for each audio element",
      "3-2-1 breathing countdown before each session starts",
    ],
  },
  {
    title: "Breathing & Meditation",
    desc: "Guided breathing exercises to destress and refocus",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    gradient: "from-pink-500 to-rose-500",
    glow: "shadow-pink-500/20",
    details: [
      "3 breathing patterns: Box Breathing (4-4-4-4), 4-7-8 Technique, Simple Calm (4-6)",
      "Visual breathing circle that grows and shrinks with your breath",
      "Audio-guided with distinct tones for inhale, hold, and exhale",
      "3 calm meditation music tracks",
      "Independent volume sliders for guide tones and music",
      "Perfect for pre-study relaxation or exam stress relief",
    ],
  },
  {
    title: "Habit Builder",
    desc: "Build daily streaks with gamified tracking and insights",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    gradient: "from-purple-500 to-pink-500",
    glow: "shadow-purple-500/20",
    details: [
      "Daily habit tracking with one-tap completion",
      "Streak counter — see your consistency grow day by day",
      "Contribution heatmap showing your activity over weeks",
      "Progress rings for visual completion tracking",
      "XP system with achievement badges and levelling",
      "Motivational messages based on research-backed habit science",
    ],
  },
  {
    title: "Reflective Diary",
    desc: "Track your mood, weather, and daily reflections",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    gradient: "from-amber-500 to-yellow-500",
    glow: "shadow-amber-500/20",
    details: [
      "Daily journal entries with rich text",
      "Happiness score (1-10) with colour-coded calendar",
      "Weather tracking per entry (sunny, cloudy, rainy, stormy, snowy)",
      "Monthly calendar shows mood-coloured dots at a glance",
      "Background colour changes with your happiness level",
      "Review past entries to spot patterns and growth",
    ],
  },
  {
    title: "School Calendar",
    desc: "QLD school terms, holidays, and public holidays at a glance",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    gradient: "from-sky-500 to-blue-500",
    glow: "shadow-sky-500/20",
    details: [
      "Queensland public holidays auto-loaded from official sources",
      "School term dates for 2026 and beyond",
      "Colour-coded: term days, holidays, public holidays",
      "Year-at-a-glance view to plan ahead",
      "Always know when the next break is coming",
    ],
  },
  {
    title: "Smart Dashboard",
    desc: "Your study command centre with stats, charts, and insights",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    gradient: "from-indigo-500 to-blue-500",
    glow: "shadow-indigo-500/20",
    details: [
      "Task status pie chart: pending, in progress, completed, overdue",
      "Daily focus time and pomodoro session counter",
      "Habit streak summaries and completion rates",
      "Diary mood calendar with happiness-coloured dots",
      "Personalised encouraging messages based on your progress",
      "Quick links to all features from one place",
    ],
  },
  {
    title: "XP & Levelling System",
    desc: "Earn XP for every study action and level up",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    gradient: "from-yellow-500 to-orange-500",
    glow: "shadow-yellow-500/20",
    details: [
      "Earn XP for pomodoros, habits, diary entries, task completions, and more",
      "Level up system with titles: Beginner → Rising Scholar → Study Legend",
      "Streak multiplier: 1.25x at 3 days, 1.5x at 7 days, 2x at 30 days",
      "Streak freezes earned every 7 days (bank up to 2) to protect your streak",
      "Daily mood check-in for wellbeing tracking (+3 XP)",
    ],
  },
  {
    title: "Study Analytics",
    desc: "Deep insights into your study patterns and productivity",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    gradient: "from-cyan-500 to-teal-500",
    glow: "shadow-cyan-500/20",
    details: [
      "14-day study time chart with week-over-week comparison",
      "Category breakdown showing time per subject",
      "7×24 productivity heatmap — find your peak focus hours",
      "Habit consistency rates and trend analysis",
      "Mood trend chart with burnout detection warnings",
      "Smart AI insights like 'Your peak focus is Tuesday afternoons'",
    ],
  },
  {
    title: "Exam Countdown",
    desc: "Never be caught off guard — countdown to every exam",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    gradient: "from-red-500 to-pink-500",
    glow: "shadow-red-500/20",
    details: [
      "Add exams with subject, date, and difficulty rating",
      "Colour-coded countdown cards: green → yellow → orange → red",
      "Dashboard widget showing days remaining for each exam",
      "Difficulty stars to prioritise study effort",
      "Quick delete when exams are done",
    ],
  },
];

function FeatureCard({ feature }: { feature: (typeof features)[number] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`group bg-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-all cursor-pointer hover:shadow-xl ${feature.glow} ${expanded ? "ring-1 ring-white/20" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg ${feature.glow}`}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
          </svg>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <h3 className="font-semibold text-white text-lg">{feature.title}</h3>
      <p className="mt-2 text-gray-400 text-sm leading-relaxed">{feature.desc}</p>

      {expanded && (
        <ul className="mt-4 space-y-2 border-t border-gray-700/50 pt-4">
          {feature.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {detail}
            </li>
          ))}
        </ul>
      )}

      {!expanded && (
        <p className="mt-3 text-xs text-blue-400 group-hover:text-blue-300">Click to learn more &darr;</p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-gray-950">
      {/* Hero Section with background image */}
      <div
        className="relative"
        style={{
          backgroundImage: "url(/images/landing-hero.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Semi-transparent overlay so background image shows through */}
        <div className="absolute inset-0 bg-gray-950/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/30 via-transparent to-gray-950/80" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        <header className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LogoIcon size={40} />
              <div className="flex flex-col leading-none">
                <span className="font-bold text-xl text-white tracking-tight">James Study</span>
                <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Studio</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-400 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium px-5 py-2.5 rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-600/25"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
            <div className="text-center max-w-3xl mx-auto">
              {/* Glowing badge */}
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-300">Free for students</span>
              </div>

              <h1 className="text-5xl sm:text-7xl font-bold leading-tight">
                <span className="text-white">Level up your </span>
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  study game
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
                Eisenhower task matrix, pomodoro focus sessions, breathing exercises,
                goal setting, weekly time planning, habit tracking, and more.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="group w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-8 py-3.5 rounded-xl hover:from-blue-500 hover:to-cyan-400 transition-all shadow-xl shadow-blue-600/25 text-lg relative overflow-hidden"
                >
                  <span className="relative z-10">Start for Free</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto text-gray-300 font-semibold px-8 py-3.5 rounded-xl border border-gray-600 hover:border-gray-400 hover:bg-white/5 transition-all text-lg backdrop-blur-sm"
                >
                  Sign In
                </Link>
              </div>

              {/* Stats bar */}
              <div className="mt-16 flex items-center justify-center gap-8 sm:gap-12">
                {[
                  { value: "12", label: "Power Tools" },
                  { value: "24/7", label: "Email Reminders" },
                  { value: "100%", label: "Free" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Features Section */}
      <div className="relative bg-gray-950">
        {/* Subtle background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-0 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute top-2/3 right-0 w-72 h-72 bg-purple-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-cyan-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything you need to succeed</h2>
            <p className="mt-3 text-gray-400 text-lg">12 powerful tools designed for how students actually study. Click any card to learn more.</p>
          </div>

          {/* Feature Cards — 3x3 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-24 text-center">
            <div className="inline-block bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 sm:p-12 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Ready to ace your studies?
              </h2>
              <p className="text-gray-400 mb-6">
                Join now and take control of your academic life.
              </p>
              <Link
                href="/register"
                className="inline-block bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-8 py-3 rounded-xl hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-600/25"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer dark />
    </div>
  );
}
