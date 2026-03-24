import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";
import {
  generateReferenceCode,
  DEFAULT_REMINDER_SCHEDULE,
  REMINDER_INTERVALS,
} from "@/lib/assignment-utils";
import { sendSetupConfirmationEmail } from "@/lib/email";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { userId: authUser.userId };
  if (status) where.status = status;

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      title,
      description,
      dueDate,
      emailEnabled,
      reminderEmail,
      reminderSchedule,
    } = await request.json();

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: "Title and due date are required" },
        { status: 400 }
      );
    }

    // If date-only (no T separator), default to 08:00
    let parsedDate: Date;
    if (typeof dueDate === "string" && !dueDate.includes("T")) {
      parsedDate = new Date(`${dueDate}T08:00:00`);
    } else {
      parsedDate = new Date(dueDate);
    }

    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    // Validate reminder schedule keys
    const validKeys: string[] = REMINDER_INTERVALS.map((i) => i.key);
    const schedule: string[] = Array.isArray(reminderSchedule)
      ? reminderSchedule.filter((k: string) => validKeys.includes(k))
      : [...DEFAULT_REMINDER_SCHEDULE];

    const referenceCode = generateReferenceCode();

    // Get user email for default reminder email
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { email: true },
    });

    const assignment = await prisma.assignment.create({
      data: {
        userId: authUser.userId,
        title,
        description: description || "",
        dueDate: parsedDate,
        emailEnabled: !!emailEnabled,
        reminderEmail: emailEnabled ? (reminderEmail || user?.email || "") : null,
        reminderSchedule: JSON.stringify(schedule),
        referenceCode,
      },
    });

    // Send setup confirmation email if email enabled
    if (emailEnabled && assignment.reminderEmail) {
      sendSetupConfirmationEmail({
        to: assignment.reminderEmail,
        assignmentTitle: title,
        description: description || "",
        dueDate: parsedDate,
        referenceCode,
        reminderSchedule: schedule,
      }).catch((err) => console.error("Setup email failed:", err));
    }

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("Assignment creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
