// Queensland school term dates and public holidays 2026-2029
// Sources:
// - https://www.qld.gov.au/recreation/travel/holidays/public
// - https://education.qld.gov.au/about-us/calendar/term-dates
// - https://education.qld.gov.au/about-us/calendar/future-dates

export interface Term {
  term: number;
  start: string; // YYYY-MM-DD
  end: string;
}

export interface SchoolYear {
  year: number;
  terms: Term[];
}

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const SCHOOL_YEARS: SchoolYear[] = [
  {
    year: 2026,
    terms: [
      { term: 1, start: "2026-01-27", end: "2026-04-02" },
      { term: 2, start: "2026-04-20", end: "2026-06-26" },
      { term: 3, start: "2026-07-13", end: "2026-09-18" },
      { term: 4, start: "2026-10-06", end: "2026-12-11" },
    ],
  },
  {
    year: 2027,
    terms: [
      { term: 1, start: "2027-01-27", end: "2027-03-25" },
      { term: 2, start: "2027-04-12", end: "2027-06-25" },
      { term: 3, start: "2027-07-12", end: "2027-09-17" },
      { term: 4, start: "2027-10-05", end: "2027-12-10" },
    ],
  },
  {
    year: 2028,
    terms: [
      { term: 1, start: "2028-01-24", end: "2028-03-31" },
      { term: 2, start: "2028-04-18", end: "2028-06-23" },
      { term: 3, start: "2028-07-10", end: "2028-09-15" },
      { term: 4, start: "2028-10-03", end: "2028-12-08" },
    ],
  },
  {
    year: 2029,
    terms: [
      { term: 1, start: "2029-01-22", end: "2029-03-29" },
      { term: 2, start: "2029-04-16", end: "2029-06-22" },
      { term: 3, start: "2029-07-09", end: "2029-09-14" },
      { term: 4, start: "2029-10-02", end: "2029-12-07" },
    ],
  },
];

export const PUBLIC_HOLIDAYS: PublicHoliday[] = [
  // 2026
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Australia Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-04", name: "Day after Good Friday" },
  { date: "2026-04-06", name: "Easter Monday" },
  { date: "2026-04-25", name: "Anzac Day" },
  { date: "2026-05-04", name: "Labour Day" },
  { date: "2026-08-12", name: "Royal Queensland Show (Brisbane)" },
  { date: "2026-10-05", name: "King's Birthday" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
  { date: "2026-12-28", name: "Boxing Day (observed)" },
  // 2027
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-01-26", name: "Australia Day" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-03-29", name: "Easter Monday" },
  { date: "2027-04-26", name: "Anzac Day" },
  { date: "2027-05-03", name: "Labour Day" },
  { date: "2027-08-11", name: "Royal Queensland Show (Brisbane)" },
  { date: "2027-10-04", name: "King's Birthday" },
  { date: "2027-12-25", name: "Christmas Day" },
  { date: "2027-12-27", name: "Christmas Day (observed)" },
  { date: "2027-12-28", name: "Boxing Day (observed)" },
  // 2028
  { date: "2028-01-01", name: "New Year's Day" },
  { date: "2028-01-03", name: "New Year's Day (observed)" },
  { date: "2028-01-26", name: "Australia Day" },
  { date: "2028-04-14", name: "Good Friday" },
  { date: "2028-04-17", name: "Easter Monday" },
  { date: "2028-04-25", name: "Anzac Day" },
  { date: "2028-05-01", name: "Labour Day" },
  { date: "2028-08-16", name: "Royal Queensland Show (Brisbane)" },
  { date: "2028-10-02", name: "King's Birthday" },
  { date: "2028-12-25", name: "Christmas Day" },
  { date: "2028-12-26", name: "Boxing Day" },
  // 2029
  { date: "2029-01-01", name: "New Year's Day" },
  { date: "2029-01-26", name: "Australia Day" },
  { date: "2029-03-30", name: "Good Friday" },
  { date: "2029-04-02", name: "Easter Monday" },
  { date: "2029-04-25", name: "Anzac Day" },
  { date: "2029-05-07", name: "Labour Day" },
  { date: "2029-08-15", name: "Royal Queensland Show (Brisbane)" },
  { date: "2029-10-01", name: "King's Birthday" },
  { date: "2029-12-25", name: "Christmas Day" },
  { date: "2029-12-26", name: "Boxing Day" },
];

// Helper: is a date within any school term?
export function isSchoolDay(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false; // weekend
  if (PUBLIC_HOLIDAYS.some((h) => h.date === dateStr)) return false;
  return SCHOOL_YEARS.some((sy) =>
    sy.terms.some((t) => dateStr >= t.start && dateStr <= t.end)
  );
}

export function isSchoolHoliday(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false; // weekends aren't "holidays" per se
  if (PUBLIC_HOLIDAYS.some((h) => h.date === dateStr)) return false;
  // If not in any term and not a weekend/public holiday, it's a school holiday
  const inTerm = SCHOOL_YEARS.some((sy) =>
    sy.terms.some((t) => dateStr >= t.start && dateStr <= t.end)
  );
  return !inTerm;
}

export function getPublicHoliday(dateStr: string): string | null {
  const h = PUBLIC_HOLIDAYS.find((h) => h.date === dateStr);
  return h ? h.name : null;
}

export function getCurrentTerm(dateStr: string): { year: number; term: number } | null {
  for (const sy of SCHOOL_YEARS) {
    for (const t of sy.terms) {
      if (dateStr >= t.start && dateStr <= t.end) {
        return { year: sy.year, term: t.term };
      }
    }
  }
  return null;
}

export function getNextSchoolEvent(dateStr: string): string {
  // Find what's coming up
  for (const sy of SCHOOL_YEARS) {
    for (const t of sy.terms) {
      if (dateStr < t.start) {
        const daysUntil = Math.ceil(
          (new Date(t.start + "T00:00:00").getTime() - new Date(dateStr + "T00:00:00").getTime()) / 86400000
        );
        return `Term ${t.term} starts in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`;
      }
      if (dateStr <= t.end) {
        const daysLeft = Math.ceil(
          (new Date(t.end + "T00:00:00").getTime() - new Date(dateStr + "T00:00:00").getTime()) / 86400000
        );
        if (daysLeft <= 14) {
          return `${daysLeft} day${daysLeft !== 1 ? "s" : ""} until holidays!`;
        }
        return `Week ${Math.ceil((new Date(dateStr + "T00:00:00").getTime() - new Date(t.start + "T00:00:00").getTime()) / 604800000) + 1} of Term ${t.term}`;
      }
    }
  }
  return "";
}

// Smart greeting based on Brisbane time and calendar
export function getSmartGreeting(brisbaneHour: number, dateStr: string): string {
  const holiday = getPublicHoliday(dateStr);
  if (holiday) return `Happy ${holiday}!`;

  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();

  if (dow === 0 || dow === 6) {
    // Weekend
    if (brisbaneHour < 5) return "Night owl! Get some rest";
    if (brisbaneHour < 12) return "Lazy weekend morning!";
    if (brisbaneHour < 17) return "Enjoy your weekend!";
    return "Chill weekend evening!";
  }

  const inTerm = getCurrentTerm(dateStr);
  const isHoliday = isSchoolHoliday(dateStr);

  if (isHoliday) {
    if (brisbaneHour < 5) return "Holiday night owl!";
    if (brisbaneHour < 12) return "Happy holidays!";
    if (brisbaneHour < 17) return "Enjoying the break!";
    return "Holiday vibes!";
  }

  // School day
  if (brisbaneHour < 5) return "Up late? Get some sleep!";
  if (brisbaneHour < 8) return "Good morning! Ready for school?";
  if (brisbaneHour < 12) return "Good morning!";
  if (brisbaneHour < 15) return "Good afternoon!";
  if (brisbaneHour < 17) return "School's out! Time to study?";
  if (brisbaneHour < 21) return "Good evening!";
  return inTerm ? "Late night study session?" : "Good night!";
}
