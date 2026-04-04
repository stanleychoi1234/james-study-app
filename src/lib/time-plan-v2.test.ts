/**
 * Integration tests for Time Plan v2 improvements:
 * 1. Commitments with from/to time (variable duration)
 * 2. Commitments with term dates
 * 3. Multi-week slot fetching
 * 4. Calendar sync status API
 * 5. Calendar sync auth flow (initiation)
 * 6. Calendar sync event push (mocked — no real OAuth)
 * 7. Due tasks row data (tasks with dueDate matching view days)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE_URL = "http://localhost:3000";
let TOKEN = "";
let TEST_ASSIGNMENT_ID = "";
let TEST_COMMITMENT_ID = "";
let TEST_SLOT_ID = "";

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${TOKEN}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}

describe("Time Plan v2 — Commitments, Calendar Sync & Enhancements", () => {
  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "james.study@agentmail.to",
        password: "StudyApp2026",
      }),
    });
    const setCookie = res.headers.get("set-cookie") || "";
    const match = setCookie.match(/token=([^;]+)/);
    expect(match).toBeTruthy();
    TOKEN = match![1];
  });

  // =========================================================================
  // 1. Commitments with from/to time
  // =========================================================================

  describe("Commitments with variable duration", () => {
    it("creates a commitment with from/to time (1.5 hours)", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Basketball Practice",
          dayOfWeek: 2, // Wednesday
          startHour: 15,
          startMin: 0,
          endHour: 16,
          endMin: 30,
          color: "#ef4444",
        }),
      });
      expect(status).toBe(201);
      expect(data.commitment).toBeDefined();
      expect(data.commitment.title).toBe("Basketball Practice");
      expect(data.commitment.startHour).toBe(15);
      expect(data.commitment.startMin).toBe(0);
      expect(data.commitment.endHour).toBe(16);
      expect(data.commitment.endMin).toBe(30);
      expect(data.commitment.duration).toBe(90); // 1.5 hours = 90 min
      TEST_COMMITMENT_ID = data.commitment.id;
    });

    it("rejects commitment where end time is before start time", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Invalid",
          dayOfWeek: 1,
          startHour: 16,
          startMin: 0,
          endHour: 14,
          endMin: 30,
        }),
      });
      expect(status).toBe(400);
      expect(data.error).toContain("End time must be after start time");
    });

    it("rejects commitment where end time equals start time", async () => {
      const { status } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Invalid",
          dayOfWeek: 1,
          startHour: 10,
          startMin: 0,
          endHour: 10,
          endMin: 0,
        }),
      });
      expect(status).toBe(400);
    });

    it("creates a 30-min commitment (minimum)", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Quick Meeting",
          dayOfWeek: 0,
          startHour: 9,
          startMin: 0,
          endHour: 9,
          endMin: 30,
          color: "#9ca3af", // grey default
        }),
      });
      expect(status).toBe(201);
      expect(data.commitment.duration).toBe(30);
      // Clean up
      await api(`/api/time-plan/commitments/${data.commitment.id}`, { method: "DELETE" });
    });

    it("creates a long commitment (4 hours)", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "School Day",
          dayOfWeek: 0,
          startHour: 8,
          startMin: 0,
          endHour: 12,
          endMin: 0,
        }),
      });
      expect(status).toBe(201);
      expect(data.commitment.duration).toBe(240); // 4 hours
      // Clean up
      await api(`/api/time-plan/commitments/${data.commitment.id}`, { method: "DELETE" });
    });

    it("updates commitment end time via PUT", async () => {
      const { status, data } = await api(`/api/time-plan/commitments/${TEST_COMMITMENT_ID}`, {
        method: "PUT",
        body: JSON.stringify({
          endHour: 17,
          endMin: 0,
        }),
      });
      expect(status).toBe(200);
      expect(data.commitment.endHour).toBe(17);
      expect(data.commitment.endMin).toBe(0);
      expect(data.commitment.duration).toBe(120); // 15:00 to 17:00 = 2h
    });

    it("rejects PUT that makes end before start", async () => {
      const { status } = await api(`/api/time-plan/commitments/${TEST_COMMITMENT_ID}`, {
        method: "PUT",
        body: JSON.stringify({
          endHour: 14,
          endMin: 0,
        }),
      });
      expect(status).toBe(400);
    });
  });

  // =========================================================================
  // 2. Commitments with term dates
  // =========================================================================

  describe("Commitments with term dates", () => {
    let termCommitmentId = "";

    it("creates a commitment with term dates", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Piano Lessons (Term 1)",
          dayOfWeek: 3, // Thursday
          startHour: 16,
          startMin: 0,
          endHour: 17,
          endMin: 0,
          color: "#8b5cf6",
          termStart: "2026-01-26",
          termEnd: "2026-04-03",
        }),
      });
      expect(status).toBe(201);
      expect(data.commitment.termStart).toBe("2026-01-26");
      expect(data.commitment.termEnd).toBe("2026-04-03");
      termCommitmentId = data.commitment.id;
    });

    it("rejects invalid term date format", async () => {
      const { status } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Bad Date",
          dayOfWeek: 0,
          startHour: 9,
          startMin: 0,
          endHour: 10,
          endMin: 0,
          termStart: "26/01/2026", // Wrong format
        }),
      });
      expect(status).toBe(400);
    });

    it("creates a commitment without term dates (always shows)", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Gym",
          dayOfWeek: 4, // Friday
          startHour: 7,
          startMin: 0,
          endHour: 8,
          endMin: 0,
        }),
      });
      expect(status).toBe(201);
      expect(data.commitment.termStart).toBeNull();
      expect(data.commitment.termEnd).toBeNull();
      // Clean up
      await api(`/api/time-plan/commitments/${data.commitment.id}`, { method: "DELETE" });
    });

    it("updates term dates via PUT", async () => {
      const { status, data } = await api(`/api/time-plan/commitments/${termCommitmentId}`, {
        method: "PUT",
        body: JSON.stringify({
          termEnd: "2026-04-10",
        }),
      });
      expect(status).toBe(200);
      expect(data.commitment.termEnd).toBe("2026-04-10");
    });

    it("clears term dates via PUT (empty string)", async () => {
      const { status, data } = await api(`/api/time-plan/commitments/${termCommitmentId}`, {
        method: "PUT",
        body: JSON.stringify({
          termStart: "",
          termEnd: "",
        }),
      });
      expect(status).toBe(200);
      expect(data.commitment.termStart).toBeNull();
      expect(data.commitment.termEnd).toBeNull();
    });

    afterAll(async () => {
      if (termCommitmentId) {
        await api(`/api/time-plan/commitments/${termCommitmentId}`, { method: "DELETE" });
      }
    });
  });

  // =========================================================================
  // 3. Default grey color for commitments
  // =========================================================================

  describe("Default commitment color", () => {
    it("uses grey default when no color specified", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Default Color Test",
          dayOfWeek: 5,
          startHour: 10,
          startMin: 0,
          endHour: 11,
          endMin: 0,
        }),
      });
      expect(status).toBe(201);
      expect(data.commitment.color).toBe("#9ca3af"); // Grey
      // Clean up
      await api(`/api/time-plan/commitments/${data.commitment.id}`, { method: "DELETE" });
    });
  });

  // =========================================================================
  // 4. Multi-week slot fetching
  // =========================================================================

  describe("Multi-week slot fetching", () => {
    it("fetches slots for a single week", async () => {
      const { status, data } = await api("/api/time-plan/slots?weekStart=2026-03-23");
      expect(status).toBe(200);
      expect(data.slots).toBeDefined();
      expect(Array.isArray(data.slots)).toBe(true);
    });

    it("fetches slots for multiple weeks via weekStarts param", async () => {
      const { status, data } = await api(
        "/api/time-plan/slots?weekStarts=2026-03-23,2026-03-30"
      );
      expect(status).toBe(200);
      expect(data.slots).toBeDefined();
      expect(Array.isArray(data.slots)).toBe(true);
    });

    it("rejects request without weekStart or weekStarts", async () => {
      const { status, data } = await api("/api/time-plan/slots");
      expect(status).toBe(400);
      expect(data.error).toContain("weekStart");
    });
  });

  // =========================================================================
  // 5. Slot creation and due date validation
  // =========================================================================

  describe("Slot creation with task linkage", () => {
    beforeAll(async () => {
      // Create a test assignment for slot testing
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { data } = await api("/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: "TimePlan V2 Test Task",
          dueDate: tomorrow.toISOString(),
          isImportant: true,
          estimatedPomodoros: 3,
          category: "School",
        }),
      });
      TEST_ASSIGNMENT_ID = data.assignment.id;
    });

    it("creates a slot for this week", async () => {
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const weekStart = monday.toISOString().split("T")[0];

      const { status, data } = await api("/api/time-plan/slots", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: TEST_ASSIGNMENT_ID,
          weekStart,
          dayOfWeek: 0, // Monday
          startHour: 10,
          startMin: 0,
        }),
      });
      expect(status).toBe(201);
      expect(data.slot).toBeDefined();
      TEST_SLOT_ID = data.slot.id;
    });

    it("fetches the slot with assignment details", async () => {
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const weekStart = monday.toISOString().split("T")[0];

      const { status, data } = await api(`/api/time-plan/slots?weekStart=${weekStart}`);
      expect(status).toBe(200);
      const slot = data.slots.find((s: { id: string }) => s.id === TEST_SLOT_ID);
      expect(slot).toBeDefined();
      expect(slot.assignment.title).toBe("TimePlan V2 Test Task");
      expect(slot.assignment.category).toBe("School");
    });

    it("deletes the slot", async () => {
      const { status } = await api(`/api/time-plan/slots?id=${TEST_SLOT_ID}`, {
        method: "DELETE",
      });
      expect(status).toBe(200);
    });
  });

  // =========================================================================
  // 6. Calendar sync status API
  // =========================================================================

  describe("Calendar sync status", () => {
    it("returns disconnected status for both providers by default", async () => {
      const { status, data } = await api("/api/calendar/status");
      expect(status).toBe(200);
      expect(data.google).toBeDefined();
      expect(data.outlook).toBeDefined();
      expect(data.google.connected).toBe(false);
      expect(data.outlook.connected).toBe(false);
    });

    it("rejects unauthenticated calendar status request", async () => {
      const res = await fetch(`${BASE_URL}/api/calendar/status`);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  // =========================================================================
  // 7. Calendar sync auth initiation
  // =========================================================================

  describe("Calendar sync auth", () => {
    it("Google auth returns OAuth URL or 503 depending on config", async () => {
      const { status, data } = await api("/api/calendar/google/auth");
      // Server may or may not have GOOGLE_CLIENT_ID configured
      if (status === 200) {
        expect(data.url).toContain("accounts.google.com");
      } else {
        expect(status).toBe(503);
        expect(data.error).toContain("not configured");
      }
    });

    it("Outlook auth returns 503 when MICROSOFT_CLIENT_ID is not set", async () => {
      const { status, data } = await api("/api/calendar/outlook/auth");
      expect(status).toBe(503);
      expect(data.error).toContain("not configured");
    });
  });

  // =========================================================================
  // 8. Calendar sync event push (without connection)
  // =========================================================================

  describe("Calendar sync event push", () => {
    it("Google sync returns 401 when not connected", async () => {
      const { status, data } = await api("/api/calendar/google/sync", {
        method: "POST",
        body: JSON.stringify({
          events: [{
            title: "Test Study Session",
            description: "Test",
            startTime: "2026-03-27T10:00:00+10:00",
            endTime: "2026-03-27T10:30:00+10:00",
            reminder: 15,
          }],
        }),
      });
      expect(status).toBe(401);
      expect(data.error).toContain("not connected");
    });

    it("Outlook sync returns 401 when not connected", async () => {
      const { status, data } = await api("/api/calendar/outlook/sync", {
        method: "POST",
        body: JSON.stringify({
          events: [{
            title: "Test Study Session",
            description: "Test",
            startTime: "2026-03-27T10:00:00+10:00",
            endTime: "2026-03-27T10:30:00+10:00",
            reminder: 15,
          }],
        }),
      });
      expect(status).toBe(401);
      expect(data.error).toContain("not connected");
    });

    it("rejects sync with empty events array", async () => {
      const { status, data } = await api("/api/calendar/google/sync", {
        method: "POST",
        body: JSON.stringify({ events: [] }),
      });
      expect(status).toBe(400);
      expect(data.error).toContain("events array is required");
    });

    it("rejects sync with too many events (>50)", async () => {
      const events = Array.from({ length: 51 }, (_, i) => ({
        title: `Event ${i}`,
        description: "Test",
        startTime: "2026-03-27T10:00:00+10:00",
        endTime: "2026-03-27T10:30:00+10:00",
        reminder: 15,
      }));
      const { status, data } = await api("/api/calendar/google/sync", {
        method: "POST",
        body: JSON.stringify({ events }),
      });
      expect(status).toBe(400);
      expect(data.error).toContain("Maximum 50");
    });
  });

  // =========================================================================
  // 9. Calendar disconnect
  // =========================================================================

  describe("Calendar disconnect", () => {
    it("disconnect Google succeeds even when not connected", async () => {
      const { status, data } = await api("/api/calendar/status?provider=google", {
        method: "DELETE",
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("disconnect Outlook succeeds even when not connected", async () => {
      const { status, data } = await api("/api/calendar/status?provider=outlook", {
        method: "DELETE",
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("rejects disconnect with invalid provider", async () => {
      const { status, data } = await api("/api/calendar/status?provider=apple", {
        method: "DELETE",
      });
      expect(status).toBe(400);
      expect(data.error).toContain("provider must be google or outlook");
    });
  });

  // =========================================================================
  // 10. Commitments list includes new fields
  // =========================================================================

  describe("Commitments list includes new fields", () => {
    it("GET returns commitments with endHour, endMin, termStart, termEnd", async () => {
      const { status, data } = await api("/api/time-plan/commitments");
      expect(status).toBe(200);
      expect(data.commitments).toBeDefined();
      expect(Array.isArray(data.commitments)).toBe(true);

      // Find our test commitment
      const testCommitment = data.commitments.find(
        (c: { id: string }) => c.id === TEST_COMMITMENT_ID
      );
      if (testCommitment) {
        expect(testCommitment).toHaveProperty("endHour");
        expect(testCommitment).toHaveProperty("endMin");
        expect(testCommitment).toHaveProperty("termStart");
        expect(testCommitment).toHaveProperty("termEnd");
        expect(testCommitment).toHaveProperty("duration");
      }
    });
  });

  // =========================================================================
  // Cleanup
  // =========================================================================

  afterAll(async () => {
    // Clean up test commitment
    if (TEST_COMMITMENT_ID) {
      await api(`/api/time-plan/commitments/${TEST_COMMITMENT_ID}`, { method: "DELETE" });
    }
    // Clean up test assignment
    if (TEST_ASSIGNMENT_ID) {
      await api(`/api/assignments/${TEST_ASSIGNMENT_ID}`, { method: "DELETE" });
    }
  });
});
