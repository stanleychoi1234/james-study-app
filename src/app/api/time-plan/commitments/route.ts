import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const commitments = await prisma.weeklyCommitment.findMany({
    where: { userId: user.userId },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
  });

  return NextResponse.json({ commitments });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, dayOfWeek, startHour, startMin, endHour, endMin, color, termStart, termEnd } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: "dayOfWeek must be 0-6" }, { status: 400 });
  }

  if (typeof startHour !== "number" || startHour < 0 || startHour > 23) {
    return NextResponse.json({ error: "startHour must be 0-23" }, { status: 400 });
  }

  if (startMin !== 0 && startMin !== 30) {
    return NextResponse.json({ error: "startMin must be 0 or 30" }, { status: 400 });
  }

  // Validate end time
  const eH = typeof endHour === "number" ? endHour : startHour;
  const eM = typeof endMin === "number" ? endMin : (startMin === 0 ? 30 : 0);

  if (eH < 0 || eH > 23) {
    return NextResponse.json({ error: "endHour must be 0-23" }, { status: 400 });
  }
  if (eM !== 0 && eM !== 30) {
    return NextResponse.json({ error: "endMin must be 0 or 30" }, { status: 400 });
  }

  // End must be after start
  const startTotal = startHour * 60 + startMin;
  const endTotal = eH * 60 + eM;
  if (endTotal <= startTotal) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  // Validate term dates if provided
  if (termStart && !/^\d{4}-\d{2}-\d{2}$/.test(termStart)) {
    return NextResponse.json({ error: "termStart must be YYYY-MM-DD" }, { status: 400 });
  }
  if (termEnd && !/^\d{4}-\d{2}-\d{2}$/.test(termEnd)) {
    return NextResponse.json({ error: "termEnd must be YYYY-MM-DD" }, { status: 400 });
  }

  const duration = endTotal - startTotal;

  const commitment = await prisma.weeklyCommitment.create({
    data: {
      userId: user.userId,
      title: title.trim(),
      dayOfWeek,
      startHour,
      startMin,
      endHour: eH,
      endMin: eM,
      duration,
      color: color || "#9ca3af",
      termStart: termStart || null,
      termEnd: termEnd || null,
    },
  });

  return NextResponse.json({ commitment }, { status: 201 });
}
