import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";
import { XP_AMOUNTS, levelFromXp, levelProgress, xpToNextLevel, levelTitle, streakMultiplier } from "@/lib/xp";

// GET — returns user's total XP, level, and recent events
export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [events, streak] = await Promise.all([
    prisma.xpEvent.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.studyStreak.findUnique({ where: { userId: authUser.userId } }),
  ]);

  const totalXp = events.reduce((sum, e) => sum + e.points, 0);
  const level = levelFromXp(totalXp);
  const progress = levelProgress(totalXp);
  const toNext = xpToNextLevel(totalXp);
  const title = levelTitle(level);
  const mult = streakMultiplier(streak?.currentStreak ?? 0);

  // Recent 20 events for display
  const recentEvents = events.slice(0, 20).map(e => ({
    id: e.id,
    source: e.source,
    points: e.points,
    date: e.date,
  }));

  // XP by day (last 14 days)
  const last14 = new Date();
  last14.setDate(last14.getDate() - 14);
  const last14Str = last14.toISOString().split("T")[0];
  const dailyXp: Record<string, number> = {};
  for (const e of events) {
    if (e.date >= last14Str) {
      dailyXp[e.date] = (dailyXp[e.date] || 0) + e.points;
    }
  }

  return NextResponse.json({
    totalXp,
    level,
    progress,
    toNext,
    title,
    multiplier: mult,
    recentEvents,
    dailyXp,
    streak: streak ? {
      current: streak.currentStreak,
      longest: streak.longestStreak,
      freezesAvailable: streak.freezesAvailable,
    } : { current: 0, longest: 0, freezesAvailable: 0 },
  });
}

// POST — award XP for an action
export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { source } = await request.json();
  if (!source || !XP_AMOUNTS[source]) {
    return NextResponse.json({ error: "Invalid XP source" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

  // Get streak for multiplier
  const streak = await prisma.studyStreak.findUnique({ where: { userId: authUser.userId } });
  const mult = streakMultiplier(streak?.currentStreak ?? 0);
  const basePoints = XP_AMOUNTS[source];
  const points = Math.round(basePoints * mult);

  const event = await prisma.xpEvent.create({
    data: {
      userId: authUser.userId,
      source,
      points,
      date: today,
    },
  });

  // Recalculate total
  const allEvents = await prisma.xpEvent.findMany({ where: { userId: authUser.userId } });
  const totalXp = allEvents.reduce((sum, e) => sum + e.points, 0);
  const level = levelFromXp(totalXp);
  const prevTotal = totalXp - points;
  const prevLevel = levelFromXp(prevTotal);
  const leveledUp = level > prevLevel;

  return NextResponse.json({
    event: { source, points, multiplier: mult },
    totalXp,
    level,
    leveledUp,
    title: levelTitle(level),
    progress: levelProgress(totalXp),
  }, { status: 201 });
}
