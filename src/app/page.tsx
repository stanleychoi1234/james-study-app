import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-2xl text-white">StudyApp</span>
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
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Glowing badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-300">Free for students</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold leading-tight">
              <span className="text-white">Level up your </span>
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                study game
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Track assignments, crush focus sessions with Pomodoro timers,
              build unstoppable habits, and reflect on your wins.
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
                className="w-full sm:w-auto text-gray-300 font-semibold px-8 py-3.5 rounded-xl border border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all text-lg"
              >
                Sign In
              </Link>
            </div>

            {/* Stats bar */}
            <div className="mt-16 flex items-center justify-center gap-8 sm:gap-12">
              {[
                { value: "4", label: "Tools" },
                { value: "24/7", label: "Email Reminders" },
                { value: "100%", label: "Free" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-16 flex justify-center">
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-blue-500/10 max-w-2xl w-full">
              <Image
                src="/images/hero-bg.png"
                alt="Futuristic neon study setup with holographic elements"
                width={1024}
                height={1024}
                className="w-full h-auto"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 to-transparent" />
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Assignment Tracker",
                desc: "Never miss a deadline with smart email reminders and progress tracking",
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                gradient: "from-blue-500 to-cyan-500",
                glow: "shadow-blue-500/20",
              },
              {
                title: "Pomodoro Timer",
                desc: "Customizable focus sessions that work even in background tabs",
                icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                gradient: "from-red-500 to-orange-500",
                glow: "shadow-red-500/20",
              },
              {
                title: "Habit Tracker",
                desc: "Build daily streaks and watch your consistency grow",
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                gradient: "from-purple-500 to-pink-500",
                glow: "shadow-purple-500/20",
              },
              {
                title: "Reflective Diary",
                desc: "Track your mood and reflect on your progress each day",
                icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                gradient: "from-amber-500 to-yellow-500",
                glow: "shadow-amber-500/20",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`group bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all hover:shadow-xl ${feature.glow} hover:-translate-y-1`}
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg ${feature.glow}`}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="font-semibold text-white text-lg">{feature.title}</h3>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
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
      </main>

      <footer className="relative z-10 p-6 text-center text-gray-600 text-sm">
        Created by James Choi &copy; with the help of Claude. Brisbane, Australia.
      </footer>
    </div>
  );
}
