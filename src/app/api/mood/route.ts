import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

// GET — returns mood check-ins for the last 30 days
export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceDate = thirtyDaysAgo.toISOString().split("T")[0];

  const checkIns = await prisma.moodCheckIn.findMany({
    where: { userId: authUser.userId, date: { gte: sinceDate } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ checkIns });
}

// POST — log today's mood (1-5 emoji scale)
export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mood } = await request.json();
  if (!mood || mood < 1 || mood > 5) {
    return NextResponse.json({ error: "Mood must be 1-5" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

  // Upsert — allow updating today's mood
  const existing = await prisma.moodCheckIn.findUnique({
    where: { userId_date: { userId: authUser.userId, date: today } },
  });

  let checkIn;
  if (existing) {
    checkIn = await prisma.moodCheckIn.update({
      where: { id: existing.id },
      data: { mood },
    });
  } else {
    checkIn = await prisma.moodCheckIn.create({
      data: { userId: authUser.userId, date: today, mood },
    });
  }

  return NextResponse.json({ checkIn }, { status: existing ? 200 : 201 });
}
