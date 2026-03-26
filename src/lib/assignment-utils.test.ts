import { describe, it, expect } from "vitest";
import {
  REMINDER_INTERVALS,
  DEFAULT_REMINDER_SCHEDULE,
  generateReferenceCode,
  parseProgressFromEmail,
  getReminderLabel,
  getReminderMs,
} from "./assignment-utils";

describe("assignment-utils", () => {
  describe("REMINDER_INTERVALS", () => {
    it("has 11 intervals from 7d down to 15m", () => {
      expect(REMINDER_INTERVALS).toHaveLength(11);
      expect(REMINDER_INTERVALS[0].key).toBe("7d");
      expect(REMINDER_INTERVALS[10].key).toBe("15m");
    });

    it("ms values are in descending order", () => {
      for (let i = 1; i < REMINDER_INTERVALS.length; i++) {
        expect(REMINDER_INTERVALS[i].ms).toBeLessThan(REMINDER_INTERVALS[i - 1].ms);
      }
    });
  });

  describe("DEFAULT_REMINDER_SCHEDULE", () => {
    it("defaults to 3d, 1d, 1h", () => {
      expect(DEFAULT_REMINDER_SCHEDULE).toEqual(["3d", "1d", "1h"]);
    });
  });

  describe("generateReferenceCode", () => {
    it("starts with ASG- prefix", () => {
      const code = generateReferenceCode();
      expect(code).toMatch(/^ASG-/);
    });

    it("is 10 characters total (ASG- + 6)", () => {
      expect(generateReferenceCode()).toHaveLength(10);
    });

    it("uses only allowed characters after prefix", () => {
      const code = generateReferenceCode();
      const suffix = code.slice(4);
      expect(suffix).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    });

    it("generates unique codes", () => {
      const codes = new Set(Array.from({ length: 50 }, () => generateReferenceCode()));
      expect(codes.size).toBe(50);
    });
  });

  describe("parseProgressFromEmail", () => {
    it("detects 'done' as 100%", () => {
      expect(parseProgressFromEmail("done")).toBe(100);
      expect(parseProgressFromEmail("DONE")).toBe(100);
      expect(parseProgressFromEmail("I'm done")).toBe(100);
    });

    it("detects 'complete/completed/finished'", () => {
      expect(parseProgressFromEmail("complete")).toBe(100);
      expect(parseProgressFromEmail("completed")).toBe(100);
      expect(parseProgressFromEmail("finished")).toBe(100);
    });

    it("detects '100%'", () => {
      expect(parseProgressFromEmail("100%")).toBe(100);
      expect(parseProgressFromEmail("100 %")).toBe(100);
    });

    it("detects percentage values", () => {
      expect(parseProgressFromEmail("50%")).toBe(50);
      expect(parseProgressFromEmail("75% done")).toBe(75);
      expect(parseProgressFromEmail("I'm at 30 percent")).toBe(30);
    });

    it("rejects percentages > 100", () => {
      expect(parseProgressFromEmail("150%")).toBeNull();
    });

    it("detects keyword patterns", () => {
      expect(parseProgressFromEmail("halfway there")).toBe(50);
      expect(parseProgressFromEmail("half done")).toBe(50);
      expect(parseProgressFromEmail("almost done")).toBe(90);
      expect(parseProgressFromEmail("nearly finished")).toBe(90);
      expect(parseProgressFromEmail("quarter done")).toBe(25);
      expect(parseProgressFromEmail("just started")).toBe(1);
    });

    it("returns null for unrecognized text", () => {
      expect(parseProgressFromEmail("hello")).toBeNull();
      expect(parseProgressFromEmail("working on it")).toBeNull();
      expect(parseProgressFromEmail("")).toBeNull();
    });
  });

  describe("getReminderLabel", () => {
    it("returns human-readable labels for known keys", () => {
      expect(getReminderLabel("7d")).toBe("7 days before");
      expect(getReminderLabel("1h")).toBe("1 hour before");
      expect(getReminderLabel("15m")).toBe("15 minutes before");
    });

    it("returns key as-is for unknown keys", () => {
      expect(getReminderLabel("unknown")).toBe("unknown");
    });
  });

  describe("getReminderMs", () => {
    it("returns correct milliseconds", () => {
      expect(getReminderMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
      expect(getReminderMs("1h")).toBe(60 * 60 * 1000);
      expect(getReminderMs("30m")).toBe(30 * 60 * 1000);
    });

    it("returns null for unknown keys", () => {
      expect(getReminderMs("unknown")).toBeNull();
    });
  });
});
