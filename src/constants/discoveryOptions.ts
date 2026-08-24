import type { ChoiceOption } from "../components/ui/SegmentedChoice";
import type { Gender } from "../types/database";

// Discovery-preferences-specific option lists. Skill level / game
// preference / play preference enum values themselves live in
// pickleballOptions.ts and are reused as-is here — this file only adds
// filter-specific lists that don't belong there.

export const DISTANCE_KM_OPTIONS: ChoiceOption<string>[] = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];

// "Who do you want to see" — deliberately just Male/Female/Both, distinct
// from GENDER_OPTIONS (pickleballOptions.ts) which covers how a user
// self-identifies (5 values, used at onboarding/profile-edit time). "Both"
// means "don't filter on gender" — a profile with any gender value,
// including non_binary/other/prefer_not_to_say, still shows up — matching
// the same BOTH-means-null-filter pattern already used for game/play
// preference in app/discovery-preferences.tsx.
export const GENDER_PREFERENCE_OPTIONS: ChoiceOption<Gender>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
