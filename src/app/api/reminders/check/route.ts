import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReminderMs } from "@/lib/assignment-utils";
import { sendReminderEmailV2 } from "@/lib/email";

// POST /api/reminders/check — per-assignment schedule checking with ReminderLog deduplication
export async function POST() {
  try {
    const now = new Date();
    const results = { checked: 0, sent: 0, skipped: 0, errors: 0 };

    // Get all non-completed assignments with email enabled
    const assignments = await prisma.assignment.findMany({
      where: {
        status: { not: "completed" },
        emailEnabled: true,
        dueDate: { gt: now },
      },
      include: {
        reminderLogs: true,
      },
    });

    results.checked = assignments.length;

    for (const assignment of assignments) {
      if (!assignment.reminderEmail) continue;

      // Parse the per-assignment reminder schedule
      let schedule: string[];
      try {
        schedule = JSON.parse(assignment.reminderSchedule);
      } catch {
        continue;
      }

      if (!Array.isArray(schedule) || schedule.length === 0) continue;

      const msUntilDue = assignment.dueDate.getTime() - now.getTime();
      const sentTypes = new Set(assignment.reminderLogs.map((l) => l.reminderType));

      for (const intervalKey of schedule) {
        // Skip if already sent
        if (sentTypes.has(intervalKey)) {
          results.skipped++;
          continue;
        }

        const intervalMs = getReminderMs(intervalKey);
        if (!intervalMs) continue;

        // Check if we're within the reminder window
        // Send if: time until due <= interval AND time until due > interval - 1 hour
        // This creates a 1-hour send window for each reminder
        const windowEnd = intervalMs - 60 * 60 * 1000;
        if (msUntilDue <= intervalMs && msUntilDue > Math.max(0, windowEnd)) {
          const emailResult = await sendReminderEmailV2({
            to: assignment.reminderEmail,
            assignmentTitle: assignment.title,
            dueDate: assignment.dueDate,
            referenceCode: assignment.referenceCode,
            intervalKey,
            progress: assignment.progress,
          });

          if (emailResult.success) {
            // Log to prevent duplicate sends
            await prisma.reminderLog.create({
              data: {
                assignmentId: assignment.id,
                reminderType: intervalKey,
              },
            });
            results.sent++;
          } else {
            results.errors++;
          }
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Reminder check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
