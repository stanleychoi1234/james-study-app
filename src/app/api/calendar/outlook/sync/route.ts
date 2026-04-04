import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/lib/auth";
import { getValidToken, createOutlookEvent, CalendarEvent } from "@/lib/calendar";

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { events } = body as { events: CalendarEvent[] };

  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "events array is required" }, { status: 400 });
  }

  if (events.length > 50) {
    return NextResponse.json({ error: "Maximum 50 events per sync" }, { status: 400 });
  }

  const tokenResult = await getValidToken(user.userId, "outlook");
  if (!tokenResult) {
    return NextResponse.json(
      { error: "Outlook Calendar not connected. Please authorize first." },
      { status: 401 }
    );
  }

  const results: { title: string; status: string; id?: string; link?: string; error?: string }[] = [];

  for (const event of events) {
    try {
      const created = await createOutlookEvent(tokenResult.accessToken, event);
      results.push({
        title: event.title,
        status: "created",
        id: created.id,
        link: created.webLink,
      });
    } catch (err) {
      results.push({
        title: event.title,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const successCount = results.filter((r) => r.status === "created").length;
  return NextResponse.json({
    synced: successCount,
    total: events.length,
    results,
  });
}
