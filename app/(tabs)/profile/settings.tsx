import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resendVerificationEmail, signOut, useAuthSession } from "../../../src/services/supabase/auth";
import { deleteOwnAccount } from "../../../src/services/supabase/accountDeletion";
import { useProfile } from "../../../src/hooks/useProfile";
import { VerifiedBadge } from "../../../src/components/ui/VerifiedBadge";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthSession();
  const userId = session?.user.id ?? null;
  const { profile, refresh: refreshProfile } = useProfile(userId);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const busy = signingOut || deleting;

  async function handleResendVerification() {
    if (!session?.user.email || resending) return;
    setResending(true);
    setVerificationMessage(null);
    const { error } = await resendVerificationEmail(session.user.email);
    setResending(false);
    setVerificationMessage(
      error
        ? { text: error, isError: true }
        : { text: "Verification email sent — check your inbox.", isError: false }
    );
  }

  async function handleRefreshVerificationStatus() {
    if (refreshingStatus) return;
    setRefreshingStatus(true);
    setVerificationMessage(null);
    await refreshProfile();
    setRefreshingStatus(false);
  }

  async function handleSignOut() {
    if (busy) return;
    setSigningOut(true);
    const { error } = await signOut();
    setSigningOut(false);

    if (error) {
      Alert.alert("Couldn't sign out", error);
      return;
    }
    router.replace("/(auth)/sign-in");
  }

  function handleDeleteAccountPress() {
    if (busy) return;
    Alert.alert(
      "Delete your account?",
      "This will permanently delete your profile, photos, matches, and messages. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Account", style: "destructive", onPress: confirmDeleteAccount },
      ]
    );
  }

  async function confirmDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteOwnAccount();
      // Only sign out locally / leave the (tabs) group once the account is
      // confirmed gone server-side — if deleteOwnAccount throws, the
      // account still exists and the user must stay signed in to retry
      // rather than getting locked out of a live account.
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't delete your account. Please try again.";
      setDeleteError(message);
      Alert.alert("Couldn't delete account", message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Settings</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Back to Profile</Text>
        </Pressable>
      </View>

      {session?.user.email ? (
        <Text style={styles.accountEmail}>Signed in as {session.user.email}</Text>
      ) : null}

      <View style={styles.section}>
        {profile?.email_verified ? (
          <View style={styles.row}>
            <View style={styles.verifiedRow}>
              <VerifiedBadge verified size={16} />
              <Text style={styles.verifiedText}>Email verified</Text>
            </View>
          </View>
        ) : (
          <View style={styles.verificationBlock}>
            <Text style={styles.verificationHint}>
              Verify your email to unlock more photos.
            </Text>
            {verificationMessage ? (
              <Text
                style={[
                  styles.verificationMessage,
                  verificationMessage.isError && styles.verificationMessageError,
                ]}
              >
                {verificationMessage.text}
              </Text>
            ) : null}
            <Pressable
              style={styles.row}
              onPress={handleResendVerification}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.rowText}>Resend verification email</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={handleRefreshVerificationStatus}
              disabled={refreshingStatus}
            >
              {refreshingStatus ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.rowText}>I've verified — refresh</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Pressable style={styles.row} onPress={handleSignOut} disabled={busy}>
          {signingOut ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={styles.rowText}>Sign Out</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.dangerLabel}>Danger Zone</Text>

        {deleteError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{deleteError}</Text>
          </View>
        ) : null}

        <Pressable style={styles.row} onPress={handleDeleteAccountPress} disabled={busy}>
          {deleting ? (
            <ActivityIndicator size="small" color="#c0392b" />
          ) : (
            <Text style={[styles.rowText, styles.destructiveText]}>Delete Account</Text>
          )}
        </Pressable>
        <Text style={styles.dangerHint}>
          Permanently deletes your profile, photos, matches, and messages. This cannot be undone.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: "700" },
  backLink: { color: "#1a7f37", fontWeight: "600", fontSize: 15 },
  accountEmail: { fontSize: 13, color: "#999", paddingHorizontal: 20, marginBottom: 24 },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedText: { fontSize: 16, color: "#222", fontWeight: "500" },
  verificationBlock: { paddingBottom: 4 },
  verificationHint: {
    fontSize: 13,
    color: "#666",
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  verificationMessage: {
    fontSize: 12,
    color: "#1a7f37",
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  verificationMessageError: { color: "#c0392b" },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 32,
  },
  dangerSection: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f6d7d3",
    paddingBottom: 14,
  },
  dangerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c0392b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  row: { paddingVertical: 16, paddingHorizontal: 16, alignItems: "flex-start" },
  rowText: { fontSize: 16, color: "#222", fontWeight: "500" },
  destructiveText: { color: "#c0392b", fontWeight: "700" },
  dangerHint: {
    fontSize: 12,
    color: "#999",
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  errorBanner: {
    backgroundColor: "#fdecea",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  errorBannerText: { color: "#c0392b", fontSize: 13 },
});
