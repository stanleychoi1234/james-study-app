import { describe, it, expect } from "vitest";
import {
  isSchoolDay,
  isSchoolHoliday,
  getPublicHoliday,
  getCurrentTerm,
  getNextSchoolEvent,
  getSmartGreeting,
  SCHOOL_YEARS,
  PUBLIC_HOLIDAYS,
} from "./school-calendar";

describe("school-calendar", () => {
  describe("data integrity", () => {
    it("has 4 school years (2026-2029)", () => {
      expect(SCHOOL_YEARS).toHaveLength(4);
      expect(SCHOOL_YEARS.map((sy) => sy.year)).toEqual([2026, 2027, 2028, 2029]);
    });

    it("each year has 4 terms", () => {
      SCHOOL_YEARS.forEach((sy) => {
        expect(sy.terms).toHaveLength(4);
        expect(sy.terms.map((t) => t.term)).toEqual([1, 2, 3, 4]);
      });
    });

    it("term start is before term end", () => {
      SCHOOL_YEARS.forEach((sy) => {
        sy.terms.forEach((t) => {
          expect(t.start < t.end).toBe(true);
        });
      });
    });

    it("has public holidays with valid date format", () => {
      expect(PUBLIC_HOLIDAYS.length).toBeGreaterThan(0);
      PUBLIC_HOLIDAYS.forEach((h) => {
        expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(h.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe("isSchoolDay", () => {
    it("returns true for a weekday during term", () => {
      // 2026-03-02 is a Monday in Term 1 (Jan 27 - Apr 2)
      expect(isSchoolDay("2026-03-02")).toBe(true);
    });

    it("returns false for a weekend", () => {
      // 2026-03-01 is a Sunday
      expect(isSchoolDay("2026-03-01")).toBe(false);
      // 2026-02-28 is a Saturday
      expect(isSchoolDay("2026-02-28")).toBe(false);
    });

    it("returns false for a public holiday", () => {
      // 2026-04-25 is Anzac Day
      expect(isSchoolDay("2026-04-25")).toBe(false);
    });

    it("returns false during school holidays (between terms)", () => {
      // 2026-04-10 is a Friday between Term 1 (ends Apr 2) and Term 2 (starts Apr 20)
      expect(isSchoolDay("2026-04-10")).toBe(false);
    });
  });

  describe("isSchoolHoliday", () => {
    it("returns true for weekdays between terms", () => {
      // 2026-04-08 is Wed between terms
      expect(isSchoolHoliday("2026-04-08")).toBe(true);
    });

    it("returns false for weekends", () => {
      expect(isSchoolHoliday("2026-04-05")).toBe(false); // Sunday
    });

    it("returns false for public holidays", () => {
      expect(isSchoolHoliday("2026-04-06")).toBe(false); // Easter Monday
    });

    it("returns false during term time", () => {
      expect(isSchoolHoliday("2026-03-10")).toBe(false); // Mid term 1
    });
  });

  describe("getPublicHoliday", () => {
    it("returns holiday name for a public holiday", () => {
      expect(getPublicHoliday("2026-12-25")).toBe("Christmas Day");
      expect(getPublicHoliday("2026-04-25")).toBe("Anzac Day");
    });

    it("returns null for non-holidays", () => {
      expect(getPublicHoliday("2026-03-10")).toBeNull();
    });
  });

  describe("getCurrentTerm", () => {
    it("returns correct term for dates within a term", () => {
      expect(getCurrentTerm("2026-02-15")).toEqual({ year: 2026, term: 1 });
      expect(getCurrentTerm("2026-05-01")).toEqual({ year: 2026, term: 2 });
      expect(getCurrentTerm("2026-08-01")).toEqual({ year: 2026, term: 3 });
      expect(getCurrentTerm("2026-11-01")).toEqual({ year: 2026, term: 4 });
    });

    it("returns null for dates between terms", () => {
      expect(getCurrentTerm("2026-04-10")).toBeNull();
    });

    it("returns correct term on term boundaries", () => {
      expect(getCurrentTerm("2026-01-27")).toEqual({ year: 2026, term: 1 });
      expect(getCurrentTerm("2026-04-02")).toEqual({ year: 2026, term: 1 });
    });
  });

  describe("getNextSchoolEvent", () => {
    it("shows days until term starts when between terms", () => {
      const result = getNextSchoolEvent("2026-04-15");
      expect(result).toContain("Term 2 starts in");
      expect(result).toContain("day");
    });

    it("shows days until holidays when close to term end", () => {
      // 2026-04-01 is 1 day before Term 1 ends (Apr 2), within 14-day window
      const result = getNextSchoolEvent("2026-04-01");
      expect(result).toContain("until holidays");
    });

    it("shows week number during mid-term", () => {
      const result = getNextSchoolEvent("2026-02-15");
      expect(result).toMatch(/Week \d+ of Term 1/);
    });
  });

  describe("getSmartGreeting", () => {
    it("returns holiday greeting on public holidays", () => {
      expect(getSmartGreeting(10, "2026-12-25")).toBe("Happy Christmas Day!");
    });

    it("returns weekend greetings on Saturday/Sunday", () => {
      // 2026-03-01 is a Sunday
      expect(getSmartGreeting(3, "2026-03-01")).toBe("Night owl! Get some rest");
      expect(getSmartGreeting(10, "2026-03-01")).toBe("Lazy weekend morning!");
      expect(getSmartGreeting(15, "2026-03-01")).toBe("Enjoy your weekend!");
      expect(getSmartGreeting(20, "2026-03-01")).toBe("Chill weekend evening!");
    });

    it("returns school-day greetings during term weekdays", () => {
      // 2026-03-02 is a Monday during Term 1
      expect(getSmartGreeting(7, "2026-03-02")).toBe("Good morning! Ready for school?");
      expect(getSmartGreeting(10, "2026-03-02")).toBe("Good morning!");
      expect(getSmartGreeting(14, "2026-03-02")).toBe("Good afternoon!");
      expect(getSmartGreeting(16, "2026-03-02")).toBe("School's out! Time to study?");
      expect(getSmartGreeting(20, "2026-03-02")).toBe("Good evening!");
    });

    it("returns holiday greetings during school holiday weekdays", () => {
      // 2026-04-08 is a Wednesday during school holidays
      expect(getSmartGreeting(10, "2026-04-08")).toBe("Happy holidays!");
      expect(getSmartGreeting(3, "2026-04-08")).toBe("Holiday night owl!");
    });

    it("returns late-night message for early hours on school days", () => {
      expect(getSmartGreeting(2, "2026-03-02")).toBe("Up late? Get some sleep!");
    });
  });
});
