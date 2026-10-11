import type { SkillLevel, Sport } from './database.types';

export const SPORTS: { value: Sport; label: string; icon: string }[] = [
  { value: 'ski', label: 'Ski', icon: 'ski' },
  { value: 'snowboard', label: 'Snowboard', icon: 'snowboard' },
  { value: 'both', label: 'Both', icon: 'snowflake' },
];

export const SKILL_LEVELS: { value: SkillLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Greens, learning the basics' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable on blues' },
  { value: 'advanced', label: 'Advanced', description: 'Blacks, trees, bumps' },
  { value: 'expert', label: 'Expert', description: 'Double blacks, steeps, backcountry' },
];

const SKILL_ORDER: SkillLevel[] = SKILL_LEVELS.map((s) => s.value);

export function sportLabel(sport: Sport | null | undefined): string {
  return SPORTS.find((s) => s.value === sport)?.label ?? 'Rider';
}

export function skillLabel(skill: SkillLevel | null | undefined): string {
  return SKILL_LEVELS.find((s) => s.value === skill)?.label ?? 'Any level';
}

/** Whether a rider meets a trip's minimum skill. No minimum means everyone. */
export function meetsSkill(rider: SkillLevel | null | undefined, minimum: SkillLevel | null): boolean {
  if (!minimum) return true;
  if (!rider) return false;
  return SKILL_ORDER.indexOf(rider) >= SKILL_ORDER.indexOf(minimum);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}
