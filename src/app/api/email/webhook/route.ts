import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseProgressFromEmail } from "@/lib/assignment-utils";

// Extract reference code from email subject line
function extractReferenceCode(subject: string): string | null {
  const match = subject.match(/\[?(ASG-[A-Z2-9]{6})\]?/);
  return match ? match[1] : null;
}

// POST /api/email/webhook — process inbound email replies to update assignment progress
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { from, subject, text } = body;

    if (!from || !subject || !text) {
      return NextResponse.json(
        { error: "Missing required fields: from, subject, text" },
        { status: 400 }
      );
    }

    // Extract reference code from subject
    const referenceCode = extractReferenceCode(subject);
    if (!referenceCode) {
      return NextResponse.json(
        { error: "No reference code found in subject" },
        { status: 400 }
      );
    }

    // Find the assignment
    const assignment = await prisma.assignment.findUnique({
      where: { referenceCode },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Verify sender email matches reminder email
    const senderEmail = typeof from === "string"
      ? from.match(/<(.+)>/)?.[1] || from.trim()
      : from;

    if (
      assignment.reminderEmail &&
      senderEmail.toLowerCase() !== assignment.reminderEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Sender email does not match" },
        { status: 403 }
      );
    }

    // Parse progress from email body
    const newProgress = parseProgressFromEmail(text);
    if (newProgress === null) {
      return NextResponse.json(
        { error: "Could not parse progress from email body" },
        { status: 400 }
      );
    }

    // Progress cannot decrease
    if (newProgress < assignment.progress) {
      return NextResponse.json(
        {
          error: `Progress cannot decrease (current: ${assignment.progress}%, requested: ${newProgress}%)`,
        },
        { status: 400 }
      );
    }

    // Build update
    const updateData: Record<string, unknown> = { progress: newProgress };

    if (newProgress > 0 && !assignment.startedAt) {
      updateData.startedAt = new Date();
      updateData.status = "in_progress";
    }

    if (newProgress === 100) {
      updateData.status = "completed";
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      assignmentId: updated.id,
      progress: updated.progress,
      status: updated.status,
    });
  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
