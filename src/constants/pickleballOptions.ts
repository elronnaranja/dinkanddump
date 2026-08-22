import type { ChoiceOption } from "../components/ui/SegmentedChoice";
import type {
  DominantHand,
  GamePreference,
  Gender,
  PlayPreference,
  PlayingFrequency,
  SkillLevel,
  YearsPlaying,
} from "../types/database";

// All value lists below mirror the enums defined in
// supabase/migrations/0002_profiles.sql, as corrected by migration 0015 to
// match the product spec's exact wording/buckets — do not add/remove
// values here without a corresponding migration.

export const SKILL_LEVEL_OPTIONS: ChoiceOption<SkillLevel>[] = [
  { value: "beginner", label: "Beginner" },
  { value: "2.0", label: "2.0" },
  { value: "2.5", label: "2.5" },
  { value: "3.0", label: "3.0" },
  { value: "3.5", label: "3.5" },
  { value: "4.0", label: "4.0" },
  { value: "4.5", label: "4.5" },
  { value: "5.0+", label: "5.0+" },
];

export const GAME_PREFERENCE_OPTIONS: ChoiceOption<GamePreference>[] = [
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
  { value: "both", label: "Both" },
];

export const PLAY_PREFERENCE_OPTIONS: ChoiceOption<PlayPreference>[] = [
  { value: "competitive", label: "Competitive" },
  { value: "casual", label: "Casual" },
  { value: "both", label: "Both" },
];

export const DOMINANT_HAND_OPTIONS: ChoiceOption<DominantHand>[] = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "ambidextrous", label: "Ambidextrous" },
];

export const PLAYING_FREQUENCY_OPTIONS: ChoiceOption<PlayingFrequency>[] = [
  { value: "occasionally", label: "Occasionally" },
  { value: "once_per_week", label: "1x per week" },
  { value: "two_to_three_per_week", label: "2 to 3x per week" },
  { value: "four_plus_per_week", label: "4+ times per week" },
];

export const YEARS_PLAYING_OPTIONS: ChoiceOption<YearsPlaying>[] = [
  { value: "less_than_1", label: "Less than 1 year" },
  { value: "one_to_two", label: "1 to 2 years" },
  { value: "three_to_five", label: "3 to 5 years" },
  { value: "five_plus", label: "5+ years" },
];

export const GENDER_OPTIONS: ChoiceOption<Gender>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function skillLevelLabel(level: SkillLevel): string {
  return SKILL_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? level;
}

export function gamePreferenceLabel(pref: GamePreference): string {
  return GAME_PREFERENCE_OPTIONS.find((o) => o.value === pref)?.label ?? pref;
}

export function playPreferenceLabel(pref: PlayPreference): string {
  return PLAY_PREFERENCE_OPTIONS.find((o) => o.value === pref)?.label ?? pref;
}

export function dominantHandLabel(hand: DominantHand): string {
  return DOMINANT_HAND_OPTIONS.find((o) => o.value === hand)?.label ?? hand;
}

export function playingFrequencyLabel(freq: PlayingFrequency): string {
  return PLAYING_FREQUENCY_OPTIONS.find((o) => o.value === freq)?.label ?? freq;
}

export function yearsPlayingLabel(years: YearsPlaying): string {
  return YEARS_PLAYING_OPTIONS.find((o) => o.value === years)?.label ?? years;
}
