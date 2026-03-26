import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

async function recalcProgress(assignmentId: string) {
  const subtasks = await prisma.subtask.findMany({ where: { assignmentId } });
  if (subtasks.length === 0) return null;
  const done = subtasks.filter(s => s.completed).length;
  const progress = Math.round((done / subtasks.length) * 100);
  const updateData: Record<string, unknown> = { progress };
  if (progress === 100) updateData.status = "completed";
  else if (progress > 0) updateData.status = "in_progress";
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (progress > 0 && assignment && !assignment.startedAt) {
    updateData.startedAt = new Date();
  }
  await prisma.assignment.update({ where: { id: assignmentId }, data: updateData });
  return progress;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, subtaskId } = await params;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment || assignment.userId !== authUser.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!existing || existing.assignmentId !== id) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (typeof body.completed === "boolean") updateData.completed = body.completed;
  if (typeof body.title === "string") updateData.title = body.title;
  if (typeof body.sortOrder === "number") updateData.sortOrder = body.sortOrder;

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: updateData,
  });

  const assignmentProgress = await recalcProgress(id);

  return NextResponse.json({ subtask, assignmentProgress });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, subtaskId } = await params;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment || assignment.userId !== authUser.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!existing || existing.assignmentId !== id) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  await prisma.subtask.delete({ where: { id: subtaskId } });

  const assignmentProgress = await recalcProgress(id);

  return NextResponse.json({ success: true, assignmentProgress });
}
