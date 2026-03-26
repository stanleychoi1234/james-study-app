import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await prisma.goal.findMany({
    where: { userId: authUser.userId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title } = await request.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const maxResult = await prisma.goal.aggregate({
    where: { userId: authUser.userId },
    _max: { sortOrder: true },
  });

  const sortOrder = (maxResult._max.sortOrder ?? -1) + 1;

  const goal = await prisma.goal.create({
    data: {
      userId: authUser.userId,
      title,
      sortOrder,
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
