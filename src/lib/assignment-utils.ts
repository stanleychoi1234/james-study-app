import crypto from "crypto";

export const REMINDER_INTERVALS = [
  { key: "7d", label: "7 days before", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "5d", label: "5 days before", ms: 5 * 24 * 60 * 60 * 1000 },
  { key: "3d", label: "3 days before", ms: 3 * 24 * 60 * 60 * 1000 },
  { key: "2d", label: "2 days before", ms: 2 * 24 * 60 * 60 * 1000 },
  { key: "1d", label: "1 day before", ms: 1 * 24 * 60 * 60 * 1000 },
  { key: "8h", label: "8 hours before", ms: 8 * 60 * 60 * 1000 },
  { key: "4h", label: "4 hours before", ms: 4 * 60 * 60 * 1000 },
  { key: "2h", label: "2 hours before", ms: 2 * 60 * 60 * 1000 },
  { key: "1h", label: "1 hour before", ms: 1 * 60 * 60 * 1000 },
  { key: "30m", label: "30 minutes before", ms: 30 * 60 * 1000 },
  { key: "15m", label: "15 minutes before", ms: 15 * 60 * 1000 },
] as const;

export const DEFAULT_REMINDER_SCHEDULE = ["3d", "1d", "1h"];

export function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "ASG-";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function parseProgressFromEmail(body: string): number | null {
  const text = body.toLowerCase().trim();

  // Check for completion keywords first
  if (/\b(done|complete|completed|finished|100\s*%)\b/.test(text)) {
    return 100;
  }

  // Check for percentage patterns: "50%", "50% done", "50 percent"
  const percentMatch = text.match(/\b(\d{1,3})\s*(%|percent)\s*(done|complete|completed)?\b/);
  if (percentMatch) {
    const value = parseInt(percentMatch[1]);
    if (value >= 0 && value <= 100) return value;
  }

  // Check for keyword patterns: "25% done", "half done", "halfway"
  if (/\b(half|halfway)\b/.test(text)) return 50;
  if (/\b(quarter|25)\s*(done|complete)?\b/.test(text)) return 25;
  if (/\b(almost|nearly|90)\s*(done|complete|finished)?\b/.test(text)) return 90;

  // Check for "started" / "start"
  if (/\b(start|started|beginning)\b/.test(text)) return 1;

  return null;
}

export function getReminderLabel(key: string): string {
  const interval = REMINDER_INTERVALS.find((i) => i.key === key);
  return interval?.label || key;
}

export function getReminderMs(key: string): number | null {
  const interval = REMINDER_INTERVALS.find((i) => i.key === key);
  return interval?.ms || null;
}
