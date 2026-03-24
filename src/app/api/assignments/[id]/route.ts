import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.assignment.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.dueDate !== undefined) {
    let parsedDate: Date;
    if (typeof body.dueDate === "string" && !body.dueDate.includes("T")) {
      parsedDate = new Date(`${body.dueDate}T08:00:00`);
    } else {
      parsedDate = new Date(body.dueDate);
    }
    if (!isNaN(parsedDate.getTime())) updateData.dueDate = parsedDate;
  }

  // Progress tracking — no decrease allowed
  if (body.progress !== undefined) {
    const newProgress = Math.max(0, Math.min(100, parseInt(body.progress)));
    if (isNaN(newProgress)) {
      return NextResponse.json({ error: "Invalid progress value" }, { status: 400 });
    }
    if (newProgress < existing.progress) {
      return NextResponse.json(
        { error: "Progress cannot decrease" },
        { status: 400 }
      );
    }
    updateData.progress = newProgress;

    // Auto-set startedAt on first progress (irreversible start)
    if (newProgress > 0 && !existing.startedAt) {
      updateData.startedAt = new Date();
      updateData.status = "in_progress";
    }

    // Auto-complete at 100%
    if (newProgress === 100) {
      updateData.status = "completed";
    }
  }

  // Start action — irreversible
  if (body.action === "start") {
    if (existing.startedAt) {
      return NextResponse.json({ error: "Already started" }, { status: 400 });
    }
    updateData.startedAt = new Date();
    updateData.status = "in_progress";
  }

  // Prevent reverting to pending once started
  if (body.status !== undefined) {
    if (body.status === "pending" && existing.startedAt) {
      return NextResponse.json(
        { error: "Cannot revert to pending after starting" },
        { status: 400 }
      );
    }
    if (body.status !== "pending") {
      updateData.status = body.status;
    }
  }

  const assignment = await prisma.assignment.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ assignment });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.assignment.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
