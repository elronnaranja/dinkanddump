import type { ChoiceOption } from "../components/ui/SegmentedChoice";
import type {
  DominantHand,
  GamePreference,
  Gender,
  PlayPreference,
  PlayingFrequency,
  SkillLevel,
} from "../types/database";

// All value lists below mirror the enums defined in
// supabase/migrations/0002_profiles.sql exactly — do not add/remove values
// here without a corresponding migration.

export const SKILL_LEVEL_OPTIONS: ChoiceOption<SkillLevel>[] = [
  "1.0",
  "1.5",
  "2.0",
  "2.5",
  "3.0",
  "3.5",
  "4.0",
  "4.5",
  "5.0",
  "5.5+",
].map((v) => ({ value: v as SkillLevel, label: v }));

export const GAME_PREFERENCE_OPTIONS: ChoiceOption<GamePreference>[] = [
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
  { value: "both", label: "Both" },
];

export const PLAY_PREFERENCE_OPTIONS: ChoiceOption<PlayPreference>[] = [
  { value: "competitive", label: "Competitive" },
  { value: "social", label: "Social" },
  { value: "both", label: "Both" },
];

export const DOMINANT_HAND_OPTIONS: ChoiceOption<DominantHand>[] = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "ambidextrous", label: "Ambidextrous" },
];

export const PLAYING_FREQUENCY_OPTIONS: ChoiceOption<PlayingFrequency>[] = [
  { value: "rarely", label: "Rarely" },
  { value: "weekly", label: "Weekly" },
  { value: "few_times_week", label: "Few times a week" },
  { value: "daily", label: "Daily" },
];

export const GENDER_OPTIONS: ChoiceOption<Gender>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function skillLevelLabel(level: SkillLevel): string {
  return level;
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
