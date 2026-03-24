import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const habit = await prisma.habit.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  await prisma.habit.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
