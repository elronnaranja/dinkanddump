import type { ChoiceOption } from "../components/ui/SegmentedChoice";

// Discovery-preferences-specific option lists. Skill level / game
// preference / play preference enum values themselves live in
// pickleballOptions.ts and are reused as-is here — this file only adds the
// one filter-specific list (distance) that doesn't belong there.

export const DISTANCE_KM_OPTIONS: ChoiceOption<string>[] = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];
