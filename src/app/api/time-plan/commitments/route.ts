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
  const { title, dayOfWeek, startHour, startMin, color } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json(
      { error: "dayOfWeek must be 0-6" },
      { status: 400 }
    );
  }

  if (typeof startHour !== "number" || startHour < 0 || startHour > 23) {
    return NextResponse.json(
      { error: "startHour must be 0-23" },
      { status: 400 }
    );
  }

  if (startMin !== 0 && startMin !== 30) {
    return NextResponse.json(
      { error: "startMin must be 0 or 30" },
      { status: 400 }
    );
  }

  const commitment = await prisma.weeklyCommitment.create({
    data: {
      userId: user.userId,
      title: title.trim(),
      dayOfWeek,
      startHour,
      startMin,
      color: color || null,
    },
  });

  return NextResponse.json({ commitment }, { status: 201 });
}
