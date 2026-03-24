import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authUser.userId;

  // Get user timezone to compute "today" correctly
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user?.timezone || "Australia/Brisbane";

  // Compute today in user's local timezone
  const nowLocal = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
  const today = nowLocal; // e.g. "2026-03-25"

  const todayStart = new Date(`${today}T00:00:00`);
  const todayEnd = new Date(`${today}T23:59:59`);

  // Fetch all data in parallel
  const [assignments, pomodoroSessions, habits, habitLogs, diaryEntries] =
    await Promise.all([
      prisma.assignment.findMany({
        where: { userId },
        orderBy: { dueDate: "asc" },
      }),
      prisma.pomodoroSession.findMany({
        where: {
          userId,
          startTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.habit.findMany({
        where: { userId },
        include: { logs: { orderBy: { logDate: "desc" }, take: 60 } },
      }),
      prisma.habitLog.findMany({
        where: { userId, logDate: today },
      }),
      prisma.diaryEntry.findMany({
        where: { userId },
        orderBy: { entryDate: "desc" },
        take: 31,
        select: { entryDate: true, moodScore: true },
      }),
    ]);

  // Assignment breakdown
  const assignmentStats = {
    pending: assignments.filter((a) => a.status === "pending").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    total: assignments.length,
    overdue: assignments.filter(
      (a) => a.status !== "completed" && new Date(a.dueDate) < new Date()
    ).length,
  };

  const upcoming = assignments
    .filter((a) => a.status !== "completed")
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate.toISOString(),
      status: a.status,
      progress: a.progress,
    }));

  const focusMinutesToday = pomodoroSessions.reduce(
    (sum, s) => sum + s.durationMinutes, 0
  );
  const focusSessionsToday = pomodoroSessions.length;

  const habitsTotal = habits.length;
  const habitsDoneToday = habitLogs.length;

  // Compute streaks
  const habitDetails = habits.map((h) => {
    const logDates = new Set(h.logs.map((l) => l.logDate));
    let streak = 0;
    const d = new Date(today + "T12:00:00"); // Use noon to avoid date rollover issues
    const todayKey = today;
    if (logDates.has(todayKey)) {
      streak = 1;
      d.setDate(d.getDate() - 1);
    }
    while (true) {
      const key = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
      if (logDates.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return {
      id: h.id,
      title: h.title,
      doneToday: habitLogs.some((l) => l.habitId === h.id),
      streak,
    };
  });

  // Diary - include moodScore for calendar coloring
  const diaryDays = diaryEntries.map((e) => ({
    date: e.entryDate,
    mood: e.moodScore,
  }));
  const todayHasEntry = diaryEntries.some((e) => e.entryDate === today);

  return NextResponse.json({
    assignmentStats,
    upcoming,
    focusMinutesToday,
    focusSessionsToday,
    habitsTotal,
    habitsDoneToday,
    habitDetails,
    diaryDays,
    todayHasEntry,
  });
}
