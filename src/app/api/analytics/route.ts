import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";
import { burnoutRisk } from "@/lib/xp";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = authUser.userId;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

  // Last 30 days range
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const d14 = new Date(); d14.setDate(d14.getDate() - 14);

  const [pomSessions, habits, habitLogs, assignments, moods, xpEvents, diaryEntries, streak] =
    await Promise.all([
      prisma.pomodoroSession.findMany({
        where: { userId, startTime: { gte: d30 } },
        orderBy: { startTime: "asc" },
        include: { assignment: { select: { category: true, title: true } } },
      }),
      prisma.habit.findMany({ where: { userId } }),
      prisma.habitLog.findMany({
        where: { userId, logDate: { gte: d30.toISOString().split("T")[0] } },
      }),
      prisma.assignment.findMany({ where: { userId } }),
      prisma.moodCheckIn.findMany({
        where: { userId, date: { gte: d30.toISOString().split("T")[0] } },
        orderBy: { date: "asc" },
      }),
      prisma.xpEvent.findMany({
        where: { userId, date: { gte: d30.toISOString().split("T")[0] } },
        orderBy: { date: "asc" },
      }),
      prisma.diaryEntry.findMany({
        where: { userId },
        orderBy: { entryDate: "desc" },
        take: 30,
        select: { entryDate: true, moodScore: true },
      }),
      prisma.studyStreak.findUnique({ where: { userId } }),
    ]);

  // --- Study time by day (last 14 days) ---
  const dailyMinutes: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dailyMinutes[d.toISOString().split("T")[0]] = 0;
  }
  for (const s of pomSessions) {
    const dateStr = s.startTime.toISOString().split("T")[0];
    if (dailyMinutes[dateStr] !== undefined) {
      dailyMinutes[dateStr] += s.durationMinutes;
    }
  }

  // --- Study time by category ---
  const categoryMinutes: Record<string, number> = {};
  for (const s of pomSessions) {
    const cat = s.assignment?.category || "Unlinked";
    categoryMinutes[cat] = (categoryMinutes[cat] || 0) + s.durationMinutes;
  }

  // --- Productivity heatmap (day of week x hour) ---
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of pomSessions) {
    const dt = new Date(s.startTime);
    const dow = dt.getDay(); // 0=Sun
    const hour = dt.getHours();
    heatmap[dow][hour] += s.durationMinutes;
  }

  // --- Weekly comparison ---
  const thisWeekMinutes = pomSessions
    .filter(s => s.startTime >= d7)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const lastWeekMinutes = pomSessions
    .filter(s => s.startTime >= d14 && s.startTime < d7)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const weekChange = lastWeekMinutes > 0
    ? Math.round(((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100)
    : thisWeekMinutes > 0 ? 100 : 0;

  // --- Habit consistency ---
  const habitConsistency = habits.map(h => {
    const logs = habitLogs.filter(l => l.habitId === h.id);
    const last7 = habitLogs.filter(l => {
      const ld = new Date(l.logDate);
      return l.habitId === h.id && ld >= d7;
    });
    return {
      id: h.id,
      title: h.title,
      totalLogs: logs.length,
      last7Days: last7.length,
      rate: Math.round((last7.length / 7) * 100),
    };
  });

  // --- Task completion rate ---
  const totalTasks = assignments.length;
  const completedTasks = assignments.filter(a => a.status === "completed").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // --- Subject balance (time this week vs last week) ---
  const thisWeekBySubject: Record<string, number> = {};
  const lastWeekBySubject: Record<string, number> = {};
  for (const s of pomSessions) {
    const cat = s.assignment?.category || "Unlinked";
    if (s.startTime >= d7) {
      thisWeekBySubject[cat] = (thisWeekBySubject[cat] || 0) + s.durationMinutes;
    } else if (s.startTime >= d14) {
      lastWeekBySubject[cat] = (lastWeekBySubject[cat] || 0) + s.durationMinutes;
    }
  }

  // --- Mood trend ---
  const moodValues = moods.map(m => m.mood);
  const moodTrend = moodValues.length >= 3
    ? (moodValues.slice(-3).reduce((a, b) => a + b, 0) / 3) -
      (moodValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3)
    : 0;

  // --- Burnout detection ---
  const last7Days = Object.entries(dailyMinutes)
    .filter(([d]) => d >= d7.toISOString().split("T")[0])
    .map(([, min]) => min);
  const avgDailyMinutes = last7Days.length > 0
    ? last7Days.reduce((a, b) => a + b, 0) / last7Days.length : 0;
  const consecutiveHighDays = (() => {
    let count = 0;
    for (const min of last7Days.reverse()) {
      if (min > 240) count++;
      else break;
    }
    return count;
  })();

  // Count meditation sessions in last 7 days (from pomodoro sessions of type 'meditation' or from diary)
  const meditationDaysLast7 = 0; // TODO: track breathing sessions

  const burnout = burnoutRisk({
    avgDailyMinutes,
    moodTrend,
    consecutiveHighDays,
    meditationDaysLast7,
  });

  // --- Smart insights ---
  const insights: string[] = [];

  // Find peak hour
  let maxMin = 0; let peakDay = 0; let peakHour = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (heatmap[d][h] > maxMin) {
        maxMin = heatmap[d][h]; peakDay = d; peakHour = h;
      }
    }
  }
  if (maxMin > 0) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hourStr = peakHour < 12 ? `${peakHour || 12} AM` : `${peakHour === 12 ? 12 : peakHour - 12} PM`;
    insights.push(`Your peak focus time is ${dayNames[peakDay]}s around ${hourStr}. Schedule harder subjects then.`);
  }

  if (weekChange > 20) {
    insights.push(`You studied ${weekChange}% more this week than last week. Great momentum!`);
  } else if (weekChange < -20) {
    insights.push(`Study time dropped ${Math.abs(weekChange)}% this week. Consider scheduling some focus blocks.`);
  }

  // Neglected categories
  const allCats = [...new Set(assignments.map(a => a.category))];
  for (const cat of allCats) {
    if (!thisWeekBySubject[cat] && assignments.some(a => a.category === cat && a.status !== "completed")) {
      insights.push(`${cat} has had no study time this week but has active tasks.`);
    }
  }

  // XP today
  const todayXp = xpEvents.filter(e => e.date === today).reduce((s, e) => s + e.points, 0);

  return NextResponse.json({
    dailyMinutes,
    categoryMinutes,
    heatmap,
    thisWeekMinutes,
    lastWeekMinutes,
    weekChange,
    habitConsistency,
    taskCompletionRate,
    totalTasks,
    completedTasks,
    thisWeekBySubject,
    lastWeekBySubject,
    moods: moods.map(m => ({ date: m.date, mood: m.mood })),
    moodTrend,
    burnout,
    insights,
    todayXp,
    streak: streak ? {
      current: streak.currentStreak,
      longest: streak.longestStreak,
      freezesAvailable: streak.freezesAvailable,
    } : { current: 0, longest: 0, freezesAvailable: 0 },
  });
}
