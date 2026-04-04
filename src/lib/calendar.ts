/**
 * Calendar sync utilities for Google Calendar and Microsoft Outlook.
 * Handles OAuth token management and event creation.
 */

// Environment variables (set in Netlify dashboard)
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
export const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jamesstudy.netlify.app";

export const GOOGLE_REDIRECT_URI = `${APP_URL}/api/calendar/google/callback`;
export const MICROSOFT_REDIRECT_URI = `${APP_URL}/api/calendar/outlook/callback`;

export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
export const MICROSOFT_SCOPES = ["Calendars.ReadWrite", "offline_access"];

export interface CalendarEvent {
  title: string;
  description: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  reminder: number;  // minutes before
  link?: string;     // link back to app
}

/**
 * Build a Google Calendar OAuth2 authorization URL
 */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchange Google auth code for tokens
 */
export async function exchangeGoogleCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }
  return res.json();
}

/**
 * Refresh a Google access token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to refresh Google token");
  }
  return res.json();
}

/**
 * Create a Google Calendar event
 */
export async function createGoogleEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ id: string; htmlLink: string }> {
  const body = {
    summary: event.title,
    description: event.description + (event.link ? `\n\nOpen in app: ${event.link}` : ""),
    start: {
      dateTime: event.startTime,
      timeZone: "Australia/Brisbane",
    },
    end: {
      dateTime: event.endTime,
      timeZone: "Australia/Brisbane",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: event.reminder },
      ],
    },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar event creation failed: ${err}`);
  }
  return res.json();
}

/**
 * Build a Microsoft OAuth2 authorization URL
 */
export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    state,
    prompt: "consent",
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

/**
 * Exchange Microsoft auth code for tokens
 */
export async function exchangeMicrosoftCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }
  return res.json();
}

/**
 * Refresh a Microsoft access token
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to refresh Microsoft token");
  }
  return res.json();
}

/**
 * Create a Microsoft Outlook Calendar event
 */
export async function createOutlookEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ id: string; webLink: string }> {
  const body = {
    subject: event.title,
    body: {
      contentType: "HTML",
      content: `${event.description}${event.link ? `<br/><br/><a href="${event.link}">Open in Study App</a>` : ""}`,
    },
    start: {
      dateTime: event.startTime,
      timeZone: "AUS Eastern Standard Time",
    },
    end: {
      dateTime: event.endTime,
      timeZone: "AUS Eastern Standard Time",
    },
    isReminderOn: true,
    reminderMinutesBeforeStart: event.reminder,
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Outlook event creation failed: ${err}`);
  }
  return res.json();
}

/**
 * Get a valid access token for a provider, refreshing if needed.
 */
export async function getValidToken(
  userId: string,
  provider: "google" | "outlook"
): Promise<{ accessToken: string } | null> {
  // Dynamic import to avoid circular deps
  const { prisma } = await import("@/lib/prisma");

  const sync = await prisma.calendarSync.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!sync) return null;

  // If token expires in less than 5 minutes, refresh
  const now = new Date();
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (sync.expiresAt > fiveMinFromNow) {
    return { accessToken: sync.accessToken };
  }

  try {
    let newToken: { access_token: string; expires_in: number; refresh_token?: string };

    if (provider === "google") {
      newToken = await refreshGoogleToken(sync.refreshToken);
    } else {
      newToken = await refreshMicrosoftToken(sync.refreshToken);
    }

    const expiresAt = new Date(Date.now() + newToken.expires_in * 1000);

    await prisma.calendarSync.update({
      where: { userId_provider: { userId, provider } },
      data: {
        accessToken: newToken.access_token,
        refreshToken: newToken.refresh_token || sync.refreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    return { accessToken: newToken.access_token };
  } catch {
    // If refresh fails, delete the sync record so user can re-auth
    await prisma.calendarSync.delete({
      where: { userId_provider: { userId, provider } },
    });
    return null;
  }
}
