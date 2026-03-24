import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { assignmentId, durationMinutes, type } = await request.json();

    if (!durationMinutes) {
      return NextResponse.json(
        { error: "Duration is required" },
        { status: 400 }
      );
    }

    // Verify assignment belongs to user if provided
    if (assignmentId) {
      const assignment = await prisma.assignment.findFirst({
        where: { id: assignmentId, userId: authUser.userId },
      });
      if (!assignment) {
        return NextResponse.json(
          { error: "Assignment not found" },
          { status: 404 }
        );
      }
    }

    const session = await prisma.pomodoroSession.create({
      data: {
        userId: authUser.userId,
        assignmentId: assignmentId || null,
        durationMinutes,
        type: type || "work",
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Pomodoro log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.pomodoroSession.findMany({
    where: { userId: authUser.userId },
    orderBy: { startTime: "desc" },
    take: 50,
    include: { assignment: { select: { title: true } } },
  });

  return NextResponse.json({ sessions });
}
