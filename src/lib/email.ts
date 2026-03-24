import nodemailer from "nodemailer";
import { getReminderLabel } from "./assignment-utils";

const smtpPort = parseInt(process.env.SMTP_PORT || "465");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.agentmail.to",
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const EMAIL_FROM = process.env.EMAIL_FROM || "james.study@agentmail.to";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function formatDueDate(dueDate: Date): string {
  return dueDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseCcEmails(ccEmails?: string | null): string[] {
  if (!ccEmails) return [];
  return ccEmails
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes("@"));
}

async function sendMail(to: string, subject: string, html: string, cc?: string[]) {
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      cc: cc && cc.length > 0 ? cc : undefined,
      subject,
      html,
      replyTo: EMAIL_FROM,
    });
    return { success: true };
  } catch (error) {
    console.error("Email send failed:", error);
    return { success: false, error };
  }
}

const replyInstructions = `
  <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3b82f6;">
    <p style="color: #1e40af; font-weight: bold; margin: 0 0 8px 0;">Update Progress via Email Reply</p>
    <p style="color: #1e3a5f; margin: 0; font-size: 14px;">
      Reply to this email with any of these keywords to update your progress:
    </p>
    <ul style="color: #1e3a5f; font-size: 13px; margin: 8px 0;">
      <li><strong>"started"</strong> — mark as started</li>
      <li><strong>"25%"</strong>, <strong>"50%"</strong>, <strong>"75%"</strong> — update progress</li>
      <li><strong>"done"</strong> or <strong>"complete"</strong> — mark as 100% finished</li>
    </ul>
  </div>
`;

// --- Setup Confirmation Email ---

interface SetupEmailParams {
  to: string;
  ccEmails?: string | null;
  assignmentTitle: string;
  description: string;
  dueDate: Date;
  referenceCode: string;
  reminderSchedule: string[];
}

export async function sendSetupConfirmationEmail({
  to,
  ccEmails,
  assignmentTitle,
  description,
  dueDate,
  referenceCode,
  reminderSchedule,
}: SetupEmailParams) {
  const dueDateStr = formatDueDate(dueDate);
  const scheduleList = reminderSchedule
    .map((key) => `<li>${getReminderLabel(key)}</li>`)
    .join("");

  const subject = `Assignment Created: ${assignmentTitle} [${referenceCode}]`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e293b;">New Assignment Created</h2>
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 16px 0;">
        <h3 style="color: #0f172a; margin-top: 0;">${assignmentTitle}</h3>
        ${description ? `<p style="color: #475569; margin: 8px 0;">${description}</p>` : ""}
        <p style="color: #64748b; margin: 8px 0;">
          <strong>Due:</strong> ${dueDateStr}
        </p>
        <p style="color: #64748b; margin: 8px 0;">
          <strong>Reference:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${referenceCode}</code>
        </p>
      </div>

      <div style="margin: 16px 0;">
        <p style="color: #334155; font-weight: bold;">Reminder Schedule:</p>
        <ul style="color: #475569; font-size: 14px;">
          ${scheduleList || "<li>No reminders configured</li>"}
        </ul>
      </div>

      ${replyInstructions}

      <a href="${APP_URL}/assignments"
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        View Assignment
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        James Study Studio — Keeping you on track
      </p>
    </div>
  `;

  return sendMail(to, subject, html, parseCcEmails(ccEmails));
}

// --- Enhanced Reminder Email ---

interface ReminderV2Params {
  to: string;
  ccEmails?: string | null;
  assignmentTitle: string;
  dueDate: Date;
  referenceCode: string;
  intervalKey: string;
  progress: number;
}

export async function sendReminderEmailV2({
  to,
  ccEmails,
  assignmentTitle,
  dueDate,
  referenceCode,
  intervalKey,
  progress,
}: ReminderV2Params) {
  const dueDateStr = formatDueDate(dueDate);
  const timeLabel = getReminderLabel(intervalKey);

  const subject = `Reminder: ${assignmentTitle} due in ${timeLabel.replace(" before", "")} [${referenceCode}]`;

  const progressColor =
    progress >= 75 ? "#16a34a" : progress >= 50 ? "#4f46e5" : progress >= 25 ? "#2563eb" : "#64748b";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e293b;">Assignment Reminder</h2>
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 16px 0;">
        <h3 style="color: #0f172a; margin-top: 0;">${assignmentTitle}</h3>
        <p style="color: #64748b; margin: 8px 0;">
          <strong>Due:</strong> ${dueDateStr}
        </p>
        <p style="color: #dc2626; font-weight: bold; font-size: 16px;">
          Due in ${timeLabel.replace(" before", "")}!
        </p>
        <div style="margin: 12px 0;">
          <p style="color: #475569; margin: 0 0 4px 0; font-size: 13px;">
            Progress: <strong style="color: ${progressColor};">${progress}%</strong>
          </p>
          <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="background: ${progressColor}; height: 100%; width: ${progress}%; border-radius: 4px;"></div>
          </div>
        </div>
      </div>

      ${replyInstructions}

      <a href="${APP_URL}/assignments"
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        View Assignment
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        James Study Studio — Keeping you on track
      </p>
    </div>
  `;

  return sendMail(to, subject, html, parseCcEmails(ccEmails));
}

// --- Legacy (kept for backward compatibility) ---

export async function sendReminderEmail({
  to,
  assignmentTitle,
  dueDate,
  urgency,
}: {
  to: string;
  assignmentTitle: string;
  dueDate: Date;
  urgency: "horizon" | "active" | "critical";
  appUrl?: string;
}) {
  const urgencyLabels = { horizon: "7 days", active: "3 days", critical: "24 hours" };
  const subject = `Reminder: "${assignmentTitle}" is due in ${urgencyLabels[urgency]}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e293b;">Assignment Reminder</h2>
      <p><strong>${assignmentTitle}</strong> is due in ${urgencyLabels[urgency]}.</p>
      <p>Due: ${formatDueDate(dueDate)}</p>
      <a href="${APP_URL}/assignments" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Assignment</a>
    </div>
  `;
  return sendMail(to, subject, html);
}
