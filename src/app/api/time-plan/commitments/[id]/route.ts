import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.weeklyCommitment.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.userId) {
    return NextResponse.json(
      { error: "Commitment not found" },
      { status: 404 }
    );
  }

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    data.title = body.title.trim();
  }

  if (body.dayOfWeek !== undefined) {
    if (typeof body.dayOfWeek !== "number" || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
      return NextResponse.json({ error: "dayOfWeek must be 0-6" }, { status: 400 });
    }
    data.dayOfWeek = body.dayOfWeek;
  }

  if (body.startHour !== undefined) {
    if (typeof body.startHour !== "number" || body.startHour < 0 || body.startHour > 23) {
      return NextResponse.json({ error: "startHour must be 0-23" }, { status: 400 });
    }
    data.startHour = body.startHour;
  }

  if (body.startMin !== undefined) {
    if (body.startMin !== 0 && body.startMin !== 30) {
      return NextResponse.json({ error: "startMin must be 0 or 30" }, { status: 400 });
    }
    data.startMin = body.startMin;
  }

  if (body.color !== undefined) {
    data.color = body.color || null;
  }

  const commitment = await prisma.weeklyCommitment.update({
    where: { id },
    data,
  });

  return NextResponse.json({ commitment });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.weeklyCommitment.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.userId) {
    return NextResponse.json(
      { error: "Commitment not found" },
      { status: 404 }
    );
  }

  await prisma.weeklyCommitment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
