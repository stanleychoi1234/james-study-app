import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const habits = await prisma.habit.findMany({
    where: { userId: authUser.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ habits });
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, frequency } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const habit = await prisma.habit.create({
      data: {
        userId: authUser.userId,
        title,
        frequency: typeof frequency === "string" ? frequency : JSON.stringify(frequency || "daily"),
      },
    });

    return NextResponse.json({ habit }, { status: 201 });
  } catch (error) {
    console.error("Habit creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
