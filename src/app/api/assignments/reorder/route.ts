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

  // Verify all assignments belong to the user, then bulk update
  const assignmentIds = items.map((item: { id: string }) => item.id);
  const userAssignments = await prisma.assignment.findMany({
    where: { id: { in: assignmentIds }, userId: authUser.userId },
    select: { id: true },
  });

  const ownedIds = new Set(userAssignments.map((a) => a.id));

  await prisma.$transaction(
    items
      .filter((item: { id: string }) => ownedIds.has(item.id))
      .map((item: { id: string; sortOrder: number }) =>
        prisma.assignment.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
  );

  return NextResponse.json({ success: true });
}
