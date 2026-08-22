import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SegmentedChoice } from "../src/components/ui/SegmentedChoice";
import { DISTANCE_KM_OPTIONS } from "../src/constants/discoveryOptions";
import {
  GAME_PREFERENCE_OPTIONS,
  PLAY_PREFERENCE_OPTIONS,
  SKILL_LEVEL_OPTIONS,
} from "../src/constants/pickleballOptions";
import { loadDiscoveryFilters, saveDiscoveryFilters } from "../src/services/discoveryPreferences";
import { DEFAULT_DISCOVERY_FILTERS } from "../src/hooks/useDiscoveryQueue";
import type { DiscoveryFilters } from "../src/types/domain";
import type { GamePreference, PlayPreference, SkillLevel } from "../src/types/database";

// A "Both" filter choice means "don't filter on this field" — the RPC
// (get_discovery_candidates, migration 0014) treats a null p_game_pref /
// p_play_pref as "any", which is different from literally requiring the
// candidate's own game_preference/play_preference column to equal 'both'.
// GAME_PREFERENCE_OPTIONS / PLAY_PREFERENCE_OPTIONS (reused as-is from
// pickleballOptions.ts, which mirror the DB enums) already include a real
// 'both' value for profile fields, so here it's remapped to/from null at
// the UI boundary rather than redefining the option lists.
const BOTH = "both";

const SKILL_LEVEL_VALUES = SKILL_LEVEL_OPTIONS.map((o) => o.value);

function skillIndex(level: SkillLevel): number {
  return SKILL_LEVEL_VALUES.indexOf(level);
}

/**
 * Modal-style screen outside the tab layout, reached via router.push from
 * the Discover screen's filter button — same file-based-route convention
 * app/match/[matchId].tsx already uses for a full-screen view that isn't
 * part of any tab.
 *
 * Deliberately just four controls per the product spec (distance, skill
 * range, game type, play type) — no additional filters. Uses an explicit
 * "Apply" button rather than apply-on-change so a half-adjusted filter set
 * never silently affects the live discovery queue until the user commits.
 */
export default function DiscoveryPreferencesScreen() {
  const router = useRouter();

  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadDiscoveryFilters()
      .then((loaded) => {
        if (mounted) setFilters(loaded);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function handleDistanceChange(value: string) {
    setFilters((f) => ({ ...f, maxDistanceKm: Number(value) }));
  }

  function handleSkillMinChange(value: SkillLevel) {
    setFilters((f) => {
      // Keep the range valid: if the new min is above the current max,
      // bring the max up with it rather than allowing an empty range.
      const skillMax = skillIndex(value) > skillIndex(f.skillMax) ? value : f.skillMax;
      return { ...f, skillMin: value, skillMax };
    });
  }

  function handleSkillMaxChange(value: SkillLevel) {
    setFilters((f) => {
      const skillMin = skillIndex(value) < skillIndex(f.skillMin) ? value : f.skillMin;
      return { ...f, skillMax: value, skillMin };
    });
  }

  function handleGamePreferenceChange(value: GamePreference | typeof BOTH) {
    setFilters((f) => ({ ...f, gamePreference: value === BOTH ? null : value }));
  }

  function handlePlayPreferenceChange(value: PlayPreference | typeof BOTH) {
    setFilters((f) => ({ ...f, playPreference: value === BOTH ? null : value }));
  }

  async function handleApply() {
    setSaving(true);
    setError(null);
    try {
      await saveDiscoveryFilters(filters);
      router.back();
    } catch {
      setError("Couldn't save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discovery Preferences</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.closeButton}>Close</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section label="Distance">
          <SegmentedChoice
            options={DISTANCE_KM_OPTIONS}
            value={String(filters.maxDistanceKm)}
            onChange={handleDistanceChange}
            columns={5}
          />
        </Section>

        <Section label="Skill level — minimum">
          <SegmentedChoice
            options={SKILL_LEVEL_OPTIONS}
            value={filters.skillMin}
            onChange={handleSkillMinChange}
            columns={5}
          />
        </Section>

        <Section label="Skill level — maximum">
          <SegmentedChoice
            options={SKILL_LEVEL_OPTIONS}
            value={filters.skillMax}
            onChange={handleSkillMaxChange}
            columns={5}
          />
        </Section>

        <Section label="Game type">
          <SegmentedChoice
            options={GAME_PREFERENCE_OPTIONS}
            value={filters.gamePreference ?? BOTH}
            onChange={handleGamePreferenceChange}
            columns={3}
          />
        </Section>

        <Section label="Play type">
          <SegmentedChoice
            options={PLAY_PREFERENCE_OPTIONS}
            value={filters.playPreference ?? BOTH}
            onChange={handlePlayPreferenceChange}
            columns={3}
          />
        </Section>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <Pressable
        style={[styles.applyButton, saving && styles.applyButtonDisabled]}
        onPress={handleApply}
        disabled={saving}
      >
        <Text style={styles.applyButtonText}>{saving ? "Saving..." : "Apply"}</Text>
      </Pressable>
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: { fontSize: 18, fontWeight: "700" },
  closeButton: { fontSize: 15, color: "#1a7f37", fontWeight: "600" },
  content: { padding: 20, paddingBottom: 12 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#999", marginBottom: 10 },
  errorText: { color: "#c0392b", fontSize: 13, textAlign: "center", marginTop: 4 },
  applyButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 24,
  },
  applyButtonDisabled: { opacity: 0.6 },
  applyButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
