import { StyleSheet, Text } from "react-native";

interface VerifiedBadgeProps {
  verified: boolean;
  size?: number;
}

/**
 * Small inline "email verified" indicator — a plain gold star, matching the
 * rest of the app's plain-Text style rather than pulling in an icon library
 * for a single glyph. Renders nothing when `verified` is false so callers
 * can drop it inline next to a name without an extra condition at the call
 * site (e.g. `<VerifiedBadge verified={profile.email_verified} />`).
 */
export function VerifiedBadge({ verified, size = 14 }: VerifiedBadgeProps) {
  if (!verified) return null;
  return (
    <Text style={[styles.star, { fontSize: size }]} accessibilityLabel="Verified email">
      ★
    </Text>
  );
}

const styles = StyleSheet.create({
  star: { color: "#f5b400", fontWeight: "700" },
});
