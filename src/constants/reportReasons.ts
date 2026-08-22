import type { ChoiceOption } from "../components/ui/SegmentedChoice";

// Reason strings per spec section 18. Stored as free text in reports.reason
// (see 0006_blocks_reports.sql — `reason text not null`, no enum), so these
// values aren't schema-constrained, but keep them stable: analytics/support
// tooling downstream may key off the exact string.
export const REPORT_REASONS: ChoiceOption<string>[] = [
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "fake_profile", label: "Fake profile" },
  { value: "not_pickleball_related", label: "Not pickleball related" },
  { value: "other", label: "Other" },
];
