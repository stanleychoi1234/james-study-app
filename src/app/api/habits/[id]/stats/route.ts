import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const habit = await prisma.habit.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  // Get all completed logs sorted by date
  const logs = await prisma.habitLog.findMany({
    where: { habitId: id, userId: authUser.userId, completed: true },
    orderBy: { logDate: "asc" },
    select: { logDate: true },
  });

  if (logs.length === 0) {
    return NextResponse.json({
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      totalCompletions: 0,
    });
  }

  // Calculate streaks using date difference algorithm
  // (equivalent to SQL window function approach but in JS for SQLite compatibility)
  const dates = logs.map((l) => l.logDate);
  const today = new Date().toISOString().split("T")[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Current streak: count backwards from today
  const lastDate = dates[dates.length - 1];
  const lastDateObj = new Date(lastDate);
  const todayObj = new Date(today);
  const daysSinceLast = Math.round(
    (todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLast <= 1) {
    // Last log is today or yesterday — count the current streak
    currentStreak = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const curr = new Date(dates[i + 1]);
      const prev = new Date(dates[i]);
      const diff = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Completion rate: completions / days since first log
  const firstDate = new Date(dates[0]);
  const totalDays =
    Math.round(
      (todayObj.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const completionRate = Math.round((dates.length / totalDays) * 100);

  return NextResponse.json({
    currentStreak,
    longestStreak,
    completionRate,
    totalCompletions: dates.length,
  });
}
