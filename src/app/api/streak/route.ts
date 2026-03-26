import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

// GET — returns current streak info
export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let streak = await prisma.studyStreak.findUnique({ where: { userId: authUser.userId } });
  if (!streak) {
    streak = await prisma.studyStreak.create({
      data: { userId: authUser.userId },
    });
  }

  return NextResponse.json({ streak });
}

// POST — check in for today (called when user does any study activity)
export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

  let streak = await prisma.studyStreak.findUnique({ where: { userId: authUser.userId } });
  if (!streak) {
    streak = await prisma.studyStreak.create({
      data: { userId: authUser.userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today },
    });
    return NextResponse.json({ streak, message: "Streak started!" }, { status: 201 });
  }

  // Already checked in today
  if (streak.lastActiveDate === today) {
    return NextResponse.json({ streak, message: "Already checked in today" });
  }

  // Calculate yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

  // Day before yesterday (for freeze)
  const dayBefore = new Date();
  dayBefore.setDate(dayBefore.getDate() - 2);
  const dayBeforeStr = dayBefore.toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

  let newStreak = streak.currentStreak;
  let freezeUsed = false;

  if (streak.lastActiveDate === yesterdayStr) {
    // Consecutive day — increment
    newStreak = streak.currentStreak + 1;
  } else if (streak.lastActiveDate === dayBeforeStr && streak.freezesAvailable > 0) {
    // Missed yesterday but have a freeze
    newStreak = streak.currentStreak + 1;
    freezeUsed = true;
  } else {
    // Streak broken — restart
    newStreak = 1;
  }

  const newLongest = Math.max(streak.longestStreak, newStreak);

  // Award freeze every 7 days (max 2 banked)
  let newFreezes = freezeUsed ? streak.freezesAvailable - 1 : streak.freezesAvailable;
  if (newStreak > 0 && newStreak % 7 === 0 && newFreezes < 2) {
    newFreezes += 1;
  }

  const updated = await prisma.studyStreak.update({
    where: { userId: authUser.userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      freezesAvailable: newFreezes,
      freezesUsed: freezeUsed ? streak.freezesUsed + 1 : streak.freezesUsed,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    streak: updated,
    freezeUsed,
    message: freezeUsed
      ? "Streak saved with a freeze! 🧊"
      : newStreak === 1 && streak.currentStreak > 1
      ? "Streak reset. Let's build a new one! 💪"
      : `${newStreak}-day streak! Keep going! 🔥`,
  });
}
