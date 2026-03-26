import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json(
      { error: "weekStart query parameter is required" },
      { status: 400 }
    );
  }

  // weekStart is stored as a string (ISO date), not a Date object
  const slots = await prisma.timePlanSlot.findMany({
    where: {
      userId: user.userId,
      weekStart: weekStart,
    },
    include: {
      assignment: {
        select: {
          title: true,
          category: true,
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
  });

  return NextResponse.json({ slots });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { assignmentId, weekStart, dayOfWeek, startHour, startMin } = body;

  if (!assignmentId || !weekStart) {
    return NextResponse.json(
      { error: "assignmentId and weekStart are required" },
      { status: 400 }
    );
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

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || assignment.userId !== user.userId) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }

  // Validate that the slot date is before or equal to the assignment due date
  const weekStartDate = new Date(weekStart);
  if (isNaN(weekStartDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid weekStart date" },
      { status: 400 }
    );
  }

  const slotDate = new Date(weekStartDate);
  slotDate.setDate(slotDate.getDate() + dayOfWeek);

  const dueDate = new Date(assignment.dueDate);
  // Compare date-only (strip time)
  slotDate.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  if (slotDate > dueDate) {
    return NextResponse.json(
      { error: "Slot date must be on or before the assignment due date" },
      { status: 400 }
    );
  }

  const slot = await prisma.timePlanSlot.create({
    data: {
      userId: user.userId,
      assignmentId,
      weekStart: weekStart,
      dayOfWeek,
      startHour,
      startMin,
    },
  });

  return NextResponse.json({ slot }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.timePlanSlot.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.userId) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  await prisma.timePlanSlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
