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
    return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
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

  if (body.endHour !== undefined) {
    if (typeof body.endHour !== "number" || body.endHour < 0 || body.endHour > 23) {
      return NextResponse.json({ error: "endHour must be 0-23" }, { status: 400 });
    }
    data.endHour = body.endHour;
  }

  if (body.endMin !== undefined) {
    if (body.endMin !== 0 && body.endMin !== 30) {
      return NextResponse.json({ error: "endMin must be 0 or 30" }, { status: 400 });
    }
    data.endMin = body.endMin;
  }

  if (body.color !== undefined) {
    data.color = body.color || "#9ca3af";
  }

  if (body.termStart !== undefined) {
    if (body.termStart && !/^\d{4}-\d{2}-\d{2}$/.test(body.termStart)) {
      return NextResponse.json({ error: "termStart must be YYYY-MM-DD" }, { status: 400 });
    }
    data.termStart = body.termStart || null;
  }

  if (body.termEnd !== undefined) {
    if (body.termEnd && !/^\d{4}-\d{2}-\d{2}$/.test(body.termEnd)) {
      return NextResponse.json({ error: "termEnd must be YYYY-MM-DD" }, { status: 400 });
    }
    data.termEnd = body.termEnd || null;
  }

  // Recalculate duration if start/end changed
  const sH = (data.startHour ?? existing.startHour) as number;
  const sM = (data.startMin ?? existing.startMin) as number;
  const eH = (data.endHour ?? existing.endHour) as number;
  const eM = (data.endMin ?? existing.endMin) as number;
  const startTotal = sH * 60 + sM;
  const endTotal = eH * 60 + eM;

  if (endTotal <= startTotal) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }
  data.duration = endTotal - startTotal;

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
    return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
  }

  await prisma.weeklyCommitment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
