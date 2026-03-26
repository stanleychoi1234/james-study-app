import { describe, it, expect } from "vitest";
import {
  TASK_CATEGORIES,
  DEFAULT_CATEGORY_COLORS,
  getCategoryColor,
} from "./categories";

describe("categories", () => {
  describe("TASK_CATEGORIES", () => {
    it("has exactly 5 categories", () => {
      expect(TASK_CATEGORIES).toHaveLength(5);
    });

    it("contains School, Private, Business, Family, Friends", () => {
      expect(TASK_CATEGORIES).toContain("School");
      expect(TASK_CATEGORIES).toContain("Private");
      expect(TASK_CATEGORIES).toContain("Business");
      expect(TASK_CATEGORIES).toContain("Family");
      expect(TASK_CATEGORIES).toContain("Friends");
    });
  });

  describe("DEFAULT_CATEGORY_COLORS", () => {
    it("has a hex color for every category", () => {
      TASK_CATEGORIES.forEach((cat) => {
        expect(DEFAULT_CATEGORY_COLORS[cat]).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it("School is blue, Private is purple, Business is green, Family is amber, Friends is pink", () => {
      expect(DEFAULT_CATEGORY_COLORS.School).toBe("#3b82f6");
      expect(DEFAULT_CATEGORY_COLORS.Private).toBe("#8b5cf6");
      expect(DEFAULT_CATEGORY_COLORS.Business).toBe("#10b981");
      expect(DEFAULT_CATEGORY_COLORS.Family).toBe("#f59e0b");
      expect(DEFAULT_CATEGORY_COLORS.Friends).toBe("#ec4899");
    });
  });

  describe("getCategoryColor", () => {
    it("returns default color for known categories", () => {
      expect(getCategoryColor("School")).toBe("#3b82f6");
      expect(getCategoryColor("Friends")).toBe("#ec4899");
    });

    it("returns gray fallback for unknown categories", () => {
      expect(getCategoryColor("Unknown")).toBe("#6b7280");
      expect(getCategoryColor("")).toBe("#6b7280");
    });

    it("uses custom colors when provided", () => {
      const custom = { School: "#ff0000" };
      expect(getCategoryColor("School", custom)).toBe("#ff0000");
    });

    it("falls back to default when custom map doesn't have the category", () => {
      const custom = { School: "#ff0000" };
      expect(getCategoryColor("Family", custom)).toBe("#f59e0b");
    });
  });
});
