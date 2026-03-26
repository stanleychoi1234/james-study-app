import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function PUT(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Items array is required" }, { status: 400 });
  }

  // Verify all goals belong to the user, then bulk update
  const goalIds = items.map((item: { id: string }) => item.id);
  const userGoals = await prisma.goal.findMany({
    where: { id: { in: goalIds }, userId: authUser.userId },
    select: { id: true },
  });

  const ownedIds = new Set(userGoals.map((g) => g.id));

  await prisma.$transaction(
    items
      .filter((item: { id: string }) => ownedIds.has(item.id))
      .map((item: { id: string; sortOrder: number }) =>
        prisma.goal.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
  );

  return NextResponse.json({ success: true });
}
