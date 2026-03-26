"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  SCHOOL_YEARS,
  PUBLIC_HOLIDAYS,
  isSchoolDay,
  isSchoolHoliday,
  getPublicHoliday,
} from "@/lib/school-calendar";

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const schoolYear = SCHOOL_YEARS.find((sy) => sy.year === viewYear);
  const yearHolidays = PUBLIC_HOLIDAYS.filter((h) => h.date.startsWith(`${viewYear}-`));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <Navbar />

      {/* Hero banner */}
      <div
        className="relative overflow-hidden bg-gray-900 mb-6"
        style={{ backgroundImage: "url(/images/calendar-banner.png)", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gray-900/60" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">School Calendar</h1>
            <p className="text-sm text-gray-300 mt-1">Queensland term dates and public holidays</p>
          </div>
          <div className="flex items-center gap-2">
            {[2026, 2027, 2028, 2029].map((y) => (
              <button key={y} onClick={() => setViewYear(y)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  viewYear === y ? "bg-blue-500 text-white" : "bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20"
                }`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" />
            <span className="text-gray-600">School day</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
            <span className="text-gray-600">School holiday</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
            <span className="text-gray-600">Public holiday</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200" />
            <span className="text-gray-600">Weekend</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded ring-2 ring-blue-500 ring-offset-1" />
            <span className="text-gray-600">Today</span>
          </div>
        </div>

        {/* Term Summary */}
        {schoolYear && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {schoolYear.terms.map((t) => {
              const start = new Date(t.start + "T00:00:00");
              const end = new Date(t.end + "T00:00:00");
              const weeks = Math.round((end.getTime() - start.getTime()) / 604800000);
              const isCurrent = todayStr >= t.start && todayStr <= t.end;
              return (
                <div key={t.term}
                  className={`rounded-xl p-4 border ${
                    isCurrent ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200" : "bg-white border-gray-100"
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">Term {t.term}</span>
                    {isCurrent && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Now</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {start.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — {end.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{weeks} weeks</p>
                </div>
              );
            })}
          </div>
        )}

        {/* 12-month grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 12 }, (_, month) => {
            const cells = getMonthDays(viewYear, month);
            return (
              <div key={month} className="bg-white rounded-xl border border-gray-100 p-3">
                <h3 className="text-sm font-bold text-gray-800 mb-2">{MONTH_NAMES[month]}</h3>
                <div className="grid grid-cols-7 gap-px text-center">
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} className="text-[9px] font-medium text-gray-400 py-0.5">{d}</div>
                  ))}
                  {cells.map((day, i) => {
                    if (day === null) return <div key={i} />;
                    const ds = dateStr(viewYear, month, day);
                    const holiday = getPublicHoliday(ds);
                    const schoolD = isSchoolDay(ds);
                    const schoolH = isSchoolHoliday(ds);
                    const d = new Date(ds + "T12:00:00");
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = ds === todayStr;

                    let bg = "";
                    if (holiday) bg = "bg-red-100 text-red-700 font-semibold";
                    else if (schoolD) bg = "bg-blue-50 text-blue-800";
                    else if (schoolH) bg = "bg-green-50 text-green-700";
                    else if (isWeekend) bg = "bg-gray-50 text-gray-400";
                    else bg = "text-gray-500";

                    return (
                      <div key={i}
                        className={`text-[10px] w-6 h-6 flex items-center justify-center rounded mx-auto ${bg} ${
                          isToday ? "ring-2 ring-blue-500 ring-offset-1 font-bold" : ""
                        }`}
                        title={holiday || (schoolD ? "School day" : schoolH ? "School holiday" : isWeekend ? "Weekend" : "")}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Public Holidays List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Public Holidays {viewYear}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {yearHolidays.map((h) => {
              const d = new Date(h.date + "T12:00:00");
              const isPast = h.date < todayStr;
              return (
                <div key={h.date}
                  className={`flex items-center justify-between p-2.5 rounded-lg ${
                    isPast ? "bg-gray-50 text-gray-400" : "bg-red-50 text-gray-700"
                  }`}>
                  <span className="text-sm font-medium">{h.name}</span>
                  <span className="text-xs text-gray-500">
                    {d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Links */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Sources</h3>
          <div className="space-y-1.5">
            <a href="https://www.qld.gov.au/recreation/travel/holidays/public"
              target="_blank" rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
              QLD Public Holidays — qld.gov.au
            </a>
            <a href="https://education.qld.gov.au/about-us/calendar/term-dates"
              target="_blank" rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
              2026 School Term Dates — education.qld.gov.au
            </a>
            <a href="https://education.qld.gov.au/about-us/calendar/future-dates"
              target="_blank" rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
              2027-2029 Future Term Dates — education.qld.gov.au
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
