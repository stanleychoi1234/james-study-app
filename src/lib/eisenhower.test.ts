import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getQuadrant, getQuadrantForTask, QUADRANT_CONFIG } from "./eisenhower";
import type { Quadrant } from "./eisenhower";

describe("eisenhower", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fix "now" to 2026-03-26T10:00:00Z
    vi.setSystemTime(new Date("2026-03-26T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("QUADRANT_CONFIG", () => {
    it("has all 4 quadrants defined", () => {
      const keys: Quadrant[] = ["do_first", "schedule", "delegate", "eliminate"];
      keys.forEach((k) => {
        expect(QUADRANT_CONFIG[k]).toBeDefined();
        expect(QUADRANT_CONFIG[k].label).toBeTruthy();
        expect(QUADRANT_CONFIG[k].color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it("do_first is red, schedule is blue, delegate is yellow, eliminate is gray", () => {
      expect(QUADRANT_CONFIG.do_first.color).toBe("#ef4444");
      expect(QUADRANT_CONFIG.schedule.color).toBe("#3b82f6");
      expect(QUADRANT_CONFIG.delegate.color).toBe("#eab308");
      expect(QUADRANT_CONFIG.eliminate.color).toBe("#6b7280");
    });
  });

  describe("getQuadrant", () => {
    it("returns do_first for important + due within 7 days (default cutoff)", () => {
      // Due in 3 days
      expect(getQuadrant(true, "2026-03-29")).toBe("do_first");
    });

    it("returns schedule for important + due after 7 days", () => {
      // Due in 30 days
      expect(getQuadrant(true, "2026-04-25")).toBe("schedule");
    });

    it("returns delegate for not important + due within 7 days", () => {
      // Due in 2 days
      expect(getQuadrant(false, "2026-03-28")).toBe("delegate");
    });

    it("returns eliminate for not important + due after 7 days", () => {
      // Due in 20 days
      expect(getQuadrant(false, "2026-04-15")).toBe("eliminate");
    });

    it("treats already-past due dates as urgent", () => {
      // Due yesterday
      expect(getQuadrant(true, "2026-03-25")).toBe("do_first");
      expect(getQuadrant(false, "2026-03-25")).toBe("delegate");
    });

    it("respects custom urgentCutoffDays", () => {
      // Due in 5 days - with cutoff=3, this is NOT urgent
      expect(getQuadrant(true, "2026-03-31", 3)).toBe("schedule");
      // Due in 2 days - with cutoff=3, this IS urgent
      expect(getQuadrant(true, "2026-03-28", 3)).toBe("do_first");
    });

    it("exactly at cutoff boundary is urgent (<=)", () => {
      // Due in exactly 7 days
      expect(getQuadrant(true, "2026-04-02")).toBe("do_first");
    });

    it("accepts Date objects", () => {
      const dueDate = new Date("2026-03-28T00:00:00Z");
      expect(getQuadrant(true, dueDate)).toBe("do_first");
    });
  });

  describe("getQuadrantForTask", () => {
    it("wraps getQuadrant with a task object", () => {
      const task = { isImportant: true, dueDate: "2026-03-28" };
      expect(getQuadrantForTask(task)).toBe("do_first");
    });

    it("accepts custom cutoff", () => {
      const task = { isImportant: false, dueDate: "2026-04-25" };
      // 30 days out, cutoff=7 => eliminate
      expect(getQuadrantForTask(task, 7)).toBe("eliminate");
      // 30 days out, cutoff=60 => delegate (urgent but not important)
      expect(getQuadrantForTask(task, 60)).toBe("delegate");
    });
  });
});
