import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseProgressFromEmail } from "@/lib/assignment-utils";

function extractReferenceCode(subject: string): string | null {
  const match = subject.match(/\[?(ASG-[A-Z2-9]{6})\]?/);
  return match ? match[1] : null;
}

// POST /api/email/webhook — process inbound email from AgentMail webhook
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // AgentMail sends { message: { from, subject, text, message_id } }
    // Also support flat format for direct calls
    const email = body.message || body;
    const { from, subject, text } = email;

    if (!from || !subject || !text) {
      return NextResponse.json(
        { error: "Missing required fields: from, subject, text" },
        { status: 400 }
      );
    }

    const referenceCode = extractReferenceCode(subject);
    if (!referenceCode) {
      return NextResponse.json(
        { error: "No reference code found in subject" },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { referenceCode },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify sender
    const senderEmail = typeof from === "string"
      ? from.match(/<(.+)>/)?.[1] || from.trim()
      : from;

    // Allow the reminder email, CC emails, or any email on the same assignment
    const allowedEmails = [
      assignment.reminderEmail,
      ...(assignment.ccEmails?.split(/[,;]/).map((e: string) => e.trim()) || []),
    ].filter(Boolean).map((e) => (e as string).toLowerCase());

    if (allowedEmails.length > 0 && !allowedEmails.includes(senderEmail.toLowerCase())) {
      return NextResponse.json({ error: "Sender email not authorized" }, { status: 403 });
    }

    const newProgress = parseProgressFromEmail(text);
    if (newProgress === null) {
      return NextResponse.json(
        { error: "Could not parse progress from email body. Reply with a percentage like '50%' or 'done'." },
        { status: 400 }
      );
    }

    if (newProgress < assignment.progress) {
      return NextResponse.json(
        { error: `Progress cannot decrease (current: ${assignment.progress}%, requested: ${newProgress}%)` },
        { status: 400 }
      );
    }

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
