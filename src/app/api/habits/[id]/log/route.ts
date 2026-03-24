import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify habit belongs to user
  const habit = await prisma.habit.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const logDate = body.logDate || new Date().toISOString().split("T")[0];

    // Check for duplicate (enforced by unique constraint too)
    const existing = await prisma.habitLog.findUnique({
      where: { habitId_logDate: { habitId: id, logDate } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Habit already logged for this date" },
        { status: 409 }
      );
    }

    const log = await prisma.habitLog.create({
      data: {
        habitId: id,
        userId: authUser.userId,
        logDate,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error("Habit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const logs = await prisma.habitLog.findMany({
    where: { habitId: id, userId: authUser.userId },
    orderBy: { logDate: "desc" },
  });

  return NextResponse.json({ logs });
}
