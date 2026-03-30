export type KidsTheme = 'castle' | 'jungle' | 'space';
export type AgeGroup = '4-6' | '7-9' | '10-12';

export interface ChildProfile {
  id: string;
  parent_id: string;
  name: string;
  date_of_birth: string;
  theme: KidsTheme;
  target_language: string;
  pin_code: string;
  daily_time_limit_min: number | null;
  avatar_id: string;
  stars_total: number;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChildProfileWithMeta extends ChildProfile {
  age: number;
  age_group: AgeGroup;
}
