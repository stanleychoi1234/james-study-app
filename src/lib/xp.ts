/**
 * XP & Levelling System
 *
 * XP Sources:
 *   - pomodoro_complete: +10 XP per work session
 *   - habit_complete:    +5 XP per habit logged
 *   - diary_entry:       +10 XP per diary entry
 *   - task_complete:     +20 XP per task completed
 *   - subtask_complete:  +5 XP per subtask ticked off
 *   - goal_complete:     +15 XP per goal achieved
 *   - mood_checkin:      +3 XP per daily mood check-in
 *   - streak_bonus:      +5 XP per streak day (on check-in)
 *
 * Level formula: Level N requires N * 100 total XP
 *   Level 1:   0 XP
 *   Level 2: 200 XP
 *   Level 3: 500 XP  (cumulative: 100+200+300...)
 *   Simplified: total XP for level L = L*(L-1)*50
 */

export const XP_AMOUNTS: Record<string, number> = {
  pomodoro_complete: 10,
  habit_complete: 5,
  diary_entry: 10,
  task_complete: 20,
  subtask_complete: 5,
  goal_complete: 15,
  mood_checkin: 3,
  streak_bonus: 5,
  breathing_session: 8,
};

/** Total XP needed to reach a given level (cumulative) */
export function xpForLevel(level: number): number {
  // Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP, Level 4 = 600 XP...
  // Formula: level*(level-1)*50
  return level * (level - 1) * 50;
}

/** Current level from total XP */
export function levelFromXp(totalXp: number): number {
  // Solve: totalXp >= level*(level-1)*50
  // level^2 - level - totalXp/50 <= 0
  // level = (1 + sqrt(1 + 4*totalXp/50)) / 2
  let level = Math.floor((1 + Math.sqrt(1 + (4 * totalXp) / 50)) / 2);
  if (level < 1) level = 1;
  return level;
}

/** Progress within current level (0-1) */
export function levelProgress(totalXp: number): number {
  const level = levelFromXp(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const range = nextLevelXp - currentLevelXp;
  if (range === 0) return 0;
  return (totalXp - currentLevelXp) / range;
}

/** XP needed to reach next level */
export function xpToNextLevel(totalXp: number): number {
  const level = levelFromXp(totalXp);
  return xpForLevel(level + 1) - totalXp;
}

/** Level title */
export function levelTitle(level: number): string {
  if (level >= 50) return "Study Legend";
  if (level >= 40) return "Study Master";
  if (level >= 30) return "Study Expert";
  if (level >= 20) return "Study Pro";
  if (level >= 15) return "Dedicated Learner";
  if (level >= 10) return "Rising Scholar";
  if (level >= 7) return "Focused Student";
  if (level >= 5) return "Active Learner";
  if (level >= 3) return "Getting Started";
  return "Beginner";
}

/** Streak multiplier */
export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.75;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.25;
  return 1.0;
}

/** Streak milestone message */
export function streakMessage(streak: number): string {
  if (streak >= 100) return "LEGENDARY! 100+ day streak!";
  if (streak >= 60) return "Incredible! 60+ days unstoppable!";
  if (streak >= 30) return "Amazing! 30-day streak, 2x XP bonus!";
  if (streak >= 14) return "On fire! 14-day streak, 1.75x XP!";
  if (streak >= 7) return "Week streak! 1.5x XP bonus unlocked!";
  if (streak >= 3) return "3-day streak! 1.25x XP bonus!";
  if (streak >= 1) return "Keep it going! Study again tomorrow.";
  return "Start your streak today!";
}

/** Burnout risk level based on recent patterns */
export function burnoutRisk(params: {
  avgDailyMinutes: number;
  moodTrend: number; // negative = declining
  consecutiveHighDays: number; // days with > 4hrs study
  meditationDaysLast7: number;
}): { level: "low" | "medium" | "high"; message: string } {
  const { avgDailyMinutes, moodTrend, consecutiveHighDays, meditationDaysLast7 } = params;

  if (consecutiveHighDays >= 5 && moodTrend < -1) {
    return { level: "high", message: "You've been pushing hard and your mood is dropping. Take a rest day — your brain consolidates learning during breaks." };
  }
  if (avgDailyMinutes > 300 && meditationDaysLast7 === 0) {
    return { level: "high", message: "Over 5 hours daily with no breaks for breathing. Try a meditation session — even 5 minutes helps." };
  }
  if (consecutiveHighDays >= 3 || (moodTrend < -0.5 && avgDailyMinutes > 180)) {
    return { level: "medium", message: "You're studying a lot. Remember: rest is productive too. Consider a lighter day." };
  }
  if (moodTrend < -0.5) {
    return { level: "medium", message: "Your mood has been trending down. A short walk or breathing exercise might help." };
  }
  return { level: "low", message: "You're maintaining a healthy study balance. Keep it up!" };
}
