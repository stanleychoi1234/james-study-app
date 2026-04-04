import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/lib/auth";
import { getGoogleAuthUrl, GOOGLE_CLIENT_ID } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google Calendar sync is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables." },
      { status: 503 }
    );
  }

  // State contains the userId so we can link back after callback
  const state = Buffer.from(JSON.stringify({ userId: user.userId })).toString("base64url");
  const url = getGoogleAuthUrl(state);

  return NextResponse.json({ url });
}
