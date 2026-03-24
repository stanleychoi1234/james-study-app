import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">StudyApp</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-white/60 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight">
              Study smarter,{" "}
              <span className="text-blue-600">not harder</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              Track assignments, stay focused with Pomodoro timers, build habits,
              and reflect on your journey. Everything you need in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 text-lg"
              >
                Start for Free
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-gray-700 font-semibold px-8 py-3.5 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors text-lg"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Assignment Tracker",
                desc: "Never miss a deadline with smart reminders",
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                color: "blue",
              },
              {
                title: "Pomodoro Timer",
                desc: "Customizable focus sessions that work even in background tabs",
                icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                color: "red",
              },
              {
                title: "Habit Tracker",
                desc: "Build streaks and see your consistency grow",
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                color: "purple",
              },
              {
                title: "Reflective Diary",
                desc: "Track your mood and reflect on your progress",
                icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                color: "amber",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    feature.color === "blue"
                      ? "bg-blue-100 text-blue-600"
                      : feature.color === "red"
                      ? "bg-red-100 text-red-600"
                      : feature.color === "purple"
                      ? "bg-purple-100 text-purple-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">{feature.title}</h3>
                <p className="mt-2 text-gray-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-gray-400 text-sm">
        StudyApp &mdash; Built for students, by students
      </footer>
    </div>
  );
}
