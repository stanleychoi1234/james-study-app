import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleCode, APP_URL } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_URL}/time-plan?calendarError=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/time-plan?calendarError=missing_params`);
  }

  try {
    // Decode state to get userId
    const { userId } = JSON.parse(Buffer.from(state, "base64url").toString());

    if (!userId) {
      return NextResponse.redirect(`${APP_URL}/time-plan?calendarError=invalid_state`);
    }

    // Exchange code for tokens
    const tokens = await exchangeGoogleCode(code);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert the calendar sync record
    await prisma.calendarSync.upsert({
      where: { userId_provider: { userId, provider: "google" } },
      create: {
        userId,
        provider: "google",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(`${APP_URL}/time-plan?calendarConnected=google`);
  } catch (err) {
    console.error("Google Calendar callback error:", err);
    return NextResponse.redirect(`${APP_URL}/time-plan?calendarError=token_exchange_failed`);
  }
}
