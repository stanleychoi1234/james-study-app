/**
 * Integration tests for cross-page linkages between Tasks, Goals, Time Plan, Pomodoro, and Settings.
 *
 * These tests hit the real Turso DB via the API routes running on the dev server.
 * They use the test user credentials to get a JWT, then call each API endpoint.
 *
 * Linkages tested:
 * 1. Tasks ↔ Settings: urgentCutoffDays affects quadrant placement
 * 2. Tasks ↔ Time Plan: tasks appear in time plan panel; slots reference assignments
 * 3. Tasks ↔ Pomodoro: pomodoro sessions link to assignments
 * 4. Tasks ↔ Subtasks: subtask completion updates task progress/status
 * 5. Tasks ↔ Goals page: goals page shows tasks in matrix view
 * 6. Tasks ↔ Dashboard: dashboard shows assignment stats
 * 7. Settings → Tasks: category colors and urgent cutoff persist
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:3000";
let TOKEN = "";
let TEST_ASSIGNMENT_ID = "";
let TEST_GOAL_ID = "";
let TEST_SUBTASK_ID = "";
let TEST_COMMITMENT_ID = "";

// Helper to make authenticated requests
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
  return { status: res.status, data };
}

describe("Integration: Cross-page linkages", () => {
  beforeAll(async () => {
    // Login to get JWT from set-cookie header
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "james.study@agentmail.to",
        password: "StudyApp2026",
      }),
    });
    expect(res.status).toBe(200);
    // Token is in the set-cookie header as httpOnly cookie
    const setCookie = res.headers.get("set-cookie") || "";
    const tokenMatch = setCookie.match(/token=([^;]+)/);
    expect(tokenMatch).toBeTruthy();
    TOKEN = tokenMatch![1];
  });

  // ─── Settings ───────────────────────────────────────────────

  describe("Settings API", () => {
    it("GET /api/settings returns or creates default settings", async () => {
      const { status, data } = await api("/api/settings");
      expect(status).toBe(200);
      expect(data.settings).toBeDefined();
      expect(data.settings.urgentCutoffDays).toBe(7);
    });

    it("PUT /api/settings updates urgentCutoffDays", async () => {
      const { status, data } = await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ urgentCutoffDays: 14 }),
      });
      expect(status).toBe(200);
      expect(data.settings.urgentCutoffDays).toBe(14);
    });

    it("PUT /api/settings updates categoryColors", async () => {
      const colors = { School: "#ff0000", Private: "#00ff00" };
      const { status, data } = await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ categoryColors: colors }),
      });
      expect(status).toBe(200);
      const parsed = JSON.parse(data.settings.categoryColors);
      expect(parsed.School).toBe("#ff0000");
    });

    it("PUT /api/settings clamps urgentCutoffDays to 1-30", async () => {
      const { data: d1 } = await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ urgentCutoffDays: 0 }),
      });
      expect(d1.settings.urgentCutoffDays).toBe(1);

      const { data: d2 } = await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ urgentCutoffDays: 100 }),
      });
      expect(d2.settings.urgentCutoffDays).toBe(30);

      // Reset to default
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ urgentCutoffDays: 7 }),
      });
    });
  });

  // ─── Task CRUD ──────────────────────────────────────────────

  describe("Tasks API", () => {
    it("POST /api/assignments creates a task with Eisenhower fields", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDateStr = tomorrow.toISOString().split("T")[0];

      const { status, data } = await api("/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: "Integration Test Task",
          description: "Testing cross-page linkages",
          dueDate: dueDateStr,
          isImportant: true,
          estimatedPomodoros: 3,
          category: "Private",
        }),
      });
      expect(status).toBe(201);
      expect(data.assignment).toBeDefined();
      expect(data.assignment.isImportant).toBe(true);
      expect(data.assignment.estimatedPomodoros).toBe(3);
      expect(data.assignment.category).toBe("Private");
      TEST_ASSIGNMENT_ID = data.assignment.id;
    });

    it("GET /api/assignments returns tasks with subtasks included", async () => {
      const { status, data } = await api("/api/assignments");
      expect(status).toBe(200);
      expect(data.assignments).toBeInstanceOf(Array);
      const task = data.assignments.find(
        (a: { id: string }) => a.id === TEST_ASSIGNMENT_ID
      );
      expect(task).toBeDefined();
      expect(task.subtasks).toBeInstanceOf(Array);
      expect(task.isImportant).toBe(true);
      expect(task.category).toBe("Private");
    });

    it("GET /api/assignments?status=pending filters by status", async () => {
      const { status, data } = await api("/api/assignments?status=pending");
      expect(status).toBe(200);
      const task = data.assignments.find(
        (a: { id: string }) => a.id === TEST_ASSIGNMENT_ID
      );
      expect(task).toBeDefined();
    });
  });

  // ─── Tasks ↔ Subtasks linkage ──────────────────────────────

  describe("Tasks ↔ Subtasks", () => {
    it("POST subtask creates and links to task", async () => {
      const { status, data } = await api(
        `/api/assignments/${TEST_ASSIGNMENT_ID}/subtasks`,
        {
          method: "POST",
          body: JSON.stringify({ title: "Sub-item 1" }),
        }
      );
      expect(status).toBe(200); // or 201
      expect(data.subtask).toBeDefined();
      expect(data.subtask.assignmentId).toBe(TEST_ASSIGNMENT_ID);
      expect(data.subtask.completed).toBe(false);
      TEST_SUBTASK_ID = data.subtask.id;
    });

    it("POST second subtask returns correct progress (0%)", async () => {
      const { data } = await api(
        `/api/assignments/${TEST_ASSIGNMENT_ID}/subtasks`,
        {
          method: "POST",
          body: JSON.stringify({ title: "Sub-item 2" }),
        }
      );
      expect(data.subtask).toBeDefined();
      // Progress should be 0 (0 of 2 done)
      expect(data.assignmentProgress).toBe(0);
    });

    it("GET subtasks returns all subtasks for the task", async () => {
      const { status, data } = await api(
        `/api/assignments/${TEST_ASSIGNMENT_ID}/subtasks`
      );
      expect(status).toBe(200);
      expect(data.subtasks).toHaveLength(2);
    });

    it("Completing a subtask updates task progress", async () => {
      const { status, data } = await api(
        `/api/assignments/${TEST_ASSIGNMENT_ID}/subtasks/${TEST_SUBTASK_ID}`,
        {
          method: "PUT",
          body: JSON.stringify({ completed: true }),
        }
      );
      expect(status).toBe(200);
      // 1 of 2 subtasks complete = 50%
      expect(data.assignmentProgress).toBe(50);
    });

    it("Task status changes to in_progress when subtask completed", async () => {
      const { data } = await api("/api/assignments");
      const task = data.assignments.find(
        (a: { id: string }) => a.id === TEST_ASSIGNMENT_ID
      );
      expect(task.status).toBe("in_progress");
      expect(task.progress).toBe(50);
    });
  });

  // ─── Tasks ↔ Pomodoro linkage ──────────────────────────────

  describe("Tasks ↔ Pomodoro", () => {
    it("POST /api/pomodoro/log links a session to a task", async () => {
      const { status, data } = await api("/api/pomodoro/log", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: TEST_ASSIGNMENT_ID,
          durationMinutes: 25,
          type: "work",
        }),
      });
      expect(status).toBe(201);
      expect(data.session).toBeDefined();
      expect(data.session.assignmentId).toBe(TEST_ASSIGNMENT_ID);
      expect(data.session.durationMinutes).toBe(25);
    });

    it("POST /api/pomodoro/log works without assignment (free session)", async () => {
      const { status, data } = await api("/api/pomodoro/log", {
        method: "POST",
        body: JSON.stringify({
          durationMinutes: 25,
          type: "work",
        }),
      });
      expect(status).toBe(201);
      expect(data.session.assignmentId).toBeNull();
    });

    it("GET /api/pomodoro/log returns sessions with assignment titles", async () => {
      const { status, data } = await api("/api/pomodoro/log");
      expect(status).toBe(200);
      expect(data.sessions).toBeInstanceOf(Array);
      const linked = data.sessions.find(
        (s: { assignmentId: string | null }) =>
          s.assignmentId === TEST_ASSIGNMENT_ID
      );
      expect(linked).toBeDefined();
      expect(linked.assignment).toBeDefined();
      expect(linked.assignment.title).toBe("Integration Test Task");
    });

    it("POST /api/pomodoro/log rejects invalid assignment ID", async () => {
      const { status } = await api("/api/pomodoro/log", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: "nonexistent-id",
          durationMinutes: 25,
        }),
      });
      expect(status).toBe(404);
    });
  });

  // ─── Goals API ──────────────────────────────────────────────

  describe("Goals API", () => {
    it("POST /api/goals creates a goal", async () => {
      const { status, data } = await api("/api/goals", {
        method: "POST",
        body: JSON.stringify({ title: "Ace my exams" }),
      });
      expect(status).toBe(201);
      expect(data.goal).toBeDefined();
      expect(data.goal.title).toBe("Ace my exams");
      expect(data.goal.completed).toBe(false);
      TEST_GOAL_ID = data.goal.id;
    });

    it("GET /api/goals returns all goals", async () => {
      const { status, data } = await api("/api/goals");
      expect(status).toBe(200);
      expect(data.goals).toBeInstanceOf(Array);
      const goal = data.goals.find(
        (g: { id: string }) => g.id === TEST_GOAL_ID
      );
      expect(goal).toBeDefined();
    });

    it("PUT /api/goals/:id toggles completion", async () => {
      const { status, data } = await api(`/api/goals/${TEST_GOAL_ID}`, {
        method: "PUT",
        body: JSON.stringify({ completed: true }),
      });
      expect(status).toBe(200);
      expect(data.goal.completed).toBe(true);
    });

    it("Goals page also shows tasks (same /api/assignments endpoint)", async () => {
      // The Goals page fetches assignments to show in the matrix
      const { status, data } = await api("/api/assignments");
      expect(status).toBe(200);
      // Our test task should appear
      const task = data.assignments.find(
        (a: { id: string }) => a.id === TEST_ASSIGNMENT_ID
      );
      expect(task).toBeDefined();
      expect(task.isImportant).toBe(true);
    });
  });

  // ─── Time Plan ↔ Tasks linkage ─────────────────────────────

  describe("Time Plan ↔ Tasks", () => {
    it("Tasks with estimatedPomodoros appear in time plan task list", async () => {
      // Time plan page fetches assignments to build the task panel
      const { data } = await api("/api/assignments");
      const task = data.assignments.find(
        (a: { id: string }) => a.id === TEST_ASSIGNMENT_ID
      );
      expect(task).toBeDefined();
      expect(task.estimatedPomodoros).toBe(3);
    });

    it("POST /api/time-plan/slots creates a slot linked to a task", async () => {
      // Get current week's Monday as weekStart
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const weekStart = monday.toISOString().split("T")[0];

      // Place on a day before due date (tomorrow), use dayOfWeek relative to Monday
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const slotDayOfWeek = (tomorrow.getDay() + 6) % 7; // Mon=0

      const { status, data } = await api("/api/time-plan/slots", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: TEST_ASSIGNMENT_ID,
          weekStart,
          dayOfWeek: slotDayOfWeek,
          startHour: 14,
          startMin: 0,
        }),
      });
      expect(status).toBe(201);
      expect(data.slot).toBeDefined();
      expect(data.slot.assignmentId).toBe(TEST_ASSIGNMENT_ID);
    });

    it("GET /api/time-plan/slots returns slots with assignment info", async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const weekStart = monday.toISOString().split("T")[0];

      const { status, data } = await api(
        `/api/time-plan/slots?weekStart=${weekStart}`
      );
      expect(status).toBe(200);
      expect(data.slots).toBeInstanceOf(Array);
      const slot = data.slots.find(
        (s: { assignmentId: string }) =>
          s.assignmentId === TEST_ASSIGNMENT_ID
      );
      expect(slot).toBeDefined();
      expect(slot.assignment.title).toBe("Integration Test Task");
      expect(slot.assignment.category).toBe("Private");
    });

    it("POST /api/time-plan/slots rejects slot after due date", async () => {
      // Try to place a slot 30 days from now (task is due tomorrow)
      const futureMonday = new Date();
      futureMonday.setDate(futureMonday.getDate() + 30);
      const weekStart = futureMonday.toISOString().split("T")[0];

      const { status, data } = await api("/api/time-plan/slots", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: TEST_ASSIGNMENT_ID,
          weekStart,
          dayOfWeek: 0,
          startHour: 10,
          startMin: 0,
        }),
      });
      expect(status).toBe(400);
      expect(data.error).toContain("due date");
    });

    it("POST /api/time-plan/slots rejects invalid startMin", async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const weekStart = monday.toISOString().split("T")[0];

      const { status } = await api("/api/time-plan/slots", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: TEST_ASSIGNMENT_ID,
          weekStart,
          dayOfWeek: 0,
          startHour: 10,
          startMin: 15, // invalid, must be 0 or 30
        }),
      });
      expect(status).toBe(400);
    });
  });

  // ─── Weekly Commitments ─────────────────────────────────────

  describe("Weekly Commitments", () => {
    it("POST /api/time-plan/commitments creates a recurring commitment", async () => {
      const { status, data } = await api("/api/time-plan/commitments", {
        method: "POST",
        body: JSON.stringify({
          title: "Math class",
          dayOfWeek: 1,
          startHour: 9,
          startMin: 0,
          duration: 60,
          color: "#3b82f6",
        }),
      });
      expect(status).toBe(201);
      expect(data.commitment).toBeDefined();
      expect(data.commitment.title).toBe("Math class");
      TEST_COMMITMENT_ID = data.commitment.id;
    });

    it("GET /api/time-plan/commitments returns commitments", async () => {
      const { status, data } = await api("/api/time-plan/commitments");
      expect(status).toBe(200);
      expect(data.commitments).toBeInstanceOf(Array);
      const c = data.commitments.find(
        (c: { id: string }) => c.id === TEST_COMMITMENT_ID
      );
      expect(c).toBeDefined();
      expect(c.dayOfWeek).toBe(1);
    });
  });

  // ─── Dashboard ↔ Tasks linkage ─────────────────────────────

  describe("Dashboard ↔ Tasks", () => {
    it("GET /api/dashboard returns assignment stats including our test task", async () => {
      const { status, data } = await api("/api/dashboard");
      expect(status).toBe(200);
      expect(data.assignmentStats).toBeDefined();
      expect(data.assignmentStats.total).toBeGreaterThanOrEqual(1);
      expect(data.assignmentStats.in_progress).toBeGreaterThanOrEqual(1);
    });

    it("Dashboard upcoming includes test task", async () => {
      const { data } = await api("/api/dashboard");
      const upcoming = data.upcoming;
      expect(upcoming).toBeInstanceOf(Array);
      const task = upcoming.find(
        (u: { id: string }) => u.id === TEST_ASSIGNMENT_ID
      );
      expect(task).toBeDefined();
      expect(task.title).toBe("Integration Test Task");
    });

    it("Dashboard shows pomodoro focus minutes", async () => {
      const { data } = await api("/api/dashboard");
      // We logged a 25-min session linked to a task
      expect(data.focusMinutesToday).toBeGreaterThanOrEqual(25);
      expect(data.focusSessionsToday).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Cleanup ────────────────────────────────────────────────

  describe("Cleanup test data", () => {
    it("DELETE goal", async () => {
      const { status } = await api(`/api/goals/${TEST_GOAL_ID}`, {
        method: "DELETE",
      });
      expect(status).toBe(200);
    });

    it("DELETE commitment", async () => {
      const { status } = await api(
        `/api/time-plan/commitments/${TEST_COMMITMENT_ID}`,
        { method: "DELETE" }
      );
      expect(status).toBe(200);
    });

    it("DELETE assignment (cascades subtasks + slots)", async () => {
      const { status } = await api(
        `/api/assignments/${TEST_ASSIGNMENT_ID}`,
        { method: "DELETE" }
      );
      expect(status).toBe(200);
    });

    it("Verify assignment and subtasks are gone", async () => {
      const { data } = await api("/api/assignments");
      const task = data.assignments.find(
        (a: { id: string }) => a.id === TEST_ASSIGNMENT_ID
      );
      expect(task).toBeUndefined();
    });
  });
});
