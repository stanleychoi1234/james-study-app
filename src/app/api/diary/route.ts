import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { userId: authUser.userId };
  if (search) {
    where.content = { contains: search };
  }

  const entries = await prisma.diaryEntry.findMany({
    where,
    orderBy: { entryDate: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { entryDate, content, moodScore, weather } = await request.json();
    const date = entryDate || new Date().toISOString().split("T")[0];

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Check for existing entry on same date
    const existing = await prisma.diaryEntry.findUnique({
      where: { userId_entryDate: { userId: authUser.userId, entryDate: date } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A diary entry already exists for this date. Please edit the existing entry instead." },
        { status: 409 }
      );
    }

    const entry = await prisma.diaryEntry.create({
      data: {
        userId: authUser.userId,
        entryDate: date,
        content,
        moodScore: moodScore ? parseInt(moodScore) : null,
        weather: weather || null,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Diary creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { entryDate, content, moodScore, weather } = await request.json();

    if (!entryDate || !content) {
      return NextResponse.json(
        { error: "Entry date and content are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.diaryEntry.findUnique({
      where: { userId_entryDate: { userId: authUser.userId, entryDate } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = await prisma.diaryEntry.update({
      where: { id: existing.id },
      data: {
        content,
        moodScore: moodScore ? parseInt(moodScore) : null,
        weather: weather !== undefined ? (weather || null) : existing.weather,
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Diary update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
