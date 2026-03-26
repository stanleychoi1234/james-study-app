import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.userSettings.findUnique({
    where: { userId: authUser.userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId: authUser.userId },
    });
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { urgentCutoffDays, categoryColors } = await request.json();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (urgentCutoffDays !== undefined) {
    const parsed = parseInt(urgentCutoffDays);
    updateData.urgentCutoffDays = Math.max(1, Math.min(30, isNaN(parsed) ? 7 : parsed));
  }
  if (categoryColors !== undefined) {
    updateData.categoryColors = typeof categoryColors === "string"
      ? categoryColors
      : JSON.stringify(categoryColors);
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: authUser.userId },
    update: updateData,
    create: {
      userId: authUser.userId,
      ...updateData,
    },
  });

  return NextResponse.json({ settings });
}
