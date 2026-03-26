export type Quadrant = "do_first" | "schedule" | "delegate" | "eliminate";

export const QUADRANT_CONFIG: Record<
  Quadrant,
  { label: string; subtitle: string; color: string; bg: string; border: string; badge: string; icon: string }
> = {
  do_first: {
    label: "DO FIRST",
    subtitle: "Important & Urgent",
    color: "#ef4444",
    bg: "bg-red-50",
    border: "border-red-300",
    badge: "bg-red-100 text-red-800",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  },
  schedule: {
    label: "SCHEDULE",
    subtitle: "Important & Not Urgent",
    color: "#3b82f6",
    bg: "bg-blue-50",
    border: "border-blue-300",
    badge: "bg-blue-100 text-blue-800",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  delegate: {
    label: "DELEGATE",
    subtitle: "Not Important & Urgent",
    color: "#eab308",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  eliminate: {
    label: "ELIMINATE",
    subtitle: "Not Important & Not Urgent",
    color: "#6b7280",
    bg: "bg-gray-50",
    border: "border-gray-300",
    badge: "bg-gray-100 text-gray-800",
    icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  },
};

export function getQuadrant(
  isImportant: boolean,
  dueDate: string | Date,
  urgentCutoffDays: number = 7
): Quadrant {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = (due.getTime() - now.getTime()) / msPerDay;
  const isUrgent = daysUntilDue <= urgentCutoffDays;

  if (isImportant && isUrgent) return "do_first";
  if (isImportant && !isUrgent) return "schedule";
  if (!isImportant && isUrgent) return "delegate";
  return "eliminate";
}

export function getQuadrantForTask(
  task: { isImportant: boolean; dueDate: string | Date },
  urgentCutoffDays: number = 7
): Quadrant {
  return getQuadrant(task.isImportant, task.dueDate, urgentCutoffDays);
}
