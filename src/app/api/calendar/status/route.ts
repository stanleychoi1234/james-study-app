import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncs = await prisma.calendarSync.findMany({
    where: { userId: user.userId },
    select: {
      provider: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const google = syncs.find((s) => s.provider === "google");
  const outlook = syncs.find((s) => s.provider === "outlook");

  return NextResponse.json({
    google: google
      ? { connected: true, connectedAt: google.createdAt, expiresAt: google.expiresAt }
      : { connected: false },
    outlook: outlook
      ? { connected: true, connectedAt: outlook.createdAt, expiresAt: outlook.expiresAt }
      : { connected: false },
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get("provider");
  if (!provider || !["google", "outlook"].includes(provider)) {
    return NextResponse.json({ error: "provider must be google or outlook" }, { status: 400 });
  }

  try {
    await prisma.calendarSync.delete({
      where: { userId_provider: { userId: user.userId, provider } },
    });
  } catch {
    // Already deleted, that's fine
  }

  return NextResponse.json({ success: true });
}
