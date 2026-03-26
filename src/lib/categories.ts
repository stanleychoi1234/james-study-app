export const TASK_CATEGORIES = ["School", "Private", "Business", "Family", "Friends"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const DEFAULT_CATEGORY_COLORS: Record<TaskCategory, string> = {
  School: "#3b82f6",
  Private: "#8b5cf6",
  Business: "#10b981",
  Family: "#f59e0b",
  Friends: "#ec4899",
};

export function getCategoryColor(
  category: string,
  customColors?: Record<string, string>
): string {
  if (customColors && customColors[category]) return customColors[category];
  return DEFAULT_CATEGORY_COLORS[category as TaskCategory] || "#6b7280";
}
