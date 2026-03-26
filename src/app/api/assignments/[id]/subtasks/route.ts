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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment || assignment.userId !== authUser.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const subtasks = await prisma.subtask.findMany({
    where: { assignmentId: id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ subtasks });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment || assignment.userId !== authUser.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const maxSortOrder = await prisma.subtask.aggregate({
    where: { assignmentId: id },
    _max: { sortOrder: true },
  });

  const sortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;

  const subtask = await prisma.subtask.create({
    data: {
      title,
      sortOrder,
      assignmentId: id,
    },
  });

  const assignmentProgress = await recalcProgress(id);

  return NextResponse.json({ subtask, assignmentProgress });
}
