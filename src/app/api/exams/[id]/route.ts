import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.userId !== authUser.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.subject !== undefined) updateData.subject = body.subject;
  if (body.examDate !== undefined) updateData.examDate = body.examDate;
  if (body.difficulty !== undefined) updateData.difficulty = Math.max(1, Math.min(5, body.difficulty));
  if (typeof body.completed === "boolean") updateData.completed = body.completed;

  const updated = await prisma.exam.update({ where: { id }, data: updateData });
  return NextResponse.json({ exam: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.userId !== authUser.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
