import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/lib/auth";
import { getMicrosoftAuthUrl, MICROSOFT_CLIENT_ID } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!MICROSOFT_CLIENT_ID) {
    return NextResponse.json(
      { error: "Outlook Calendar sync is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables." },
      { status: 503 }
    );
  }

  const state = Buffer.from(JSON.stringify({ userId: user.userId })).toString("base64url");
  const url = getMicrosoftAuthUrl(state);

  return NextResponse.json({ url });
}
