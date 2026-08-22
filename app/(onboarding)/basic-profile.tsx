import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { StepProgressBar } from "../../src/components/ui/StepProgressBar";
import { WizardNav } from "../../src/components/ui/WizardNav";
import { SegmentedChoice } from "../../src/components/ui/SegmentedChoice";
import { GENDER_OPTIONS } from "../../src/constants/pickleballOptions";
import { useOnboarding } from "../../src/context/OnboardingContext";
import { isUsernameAvailable } from "../../src/services/supabase/profiles";
import { isAtLeastMinimumAge, toDateOnlyString, MINIMUM_AGE } from "../../src/utils/age";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export default function BasicProfileScreen() {
  const router = useRouter();
  const { state, update } = useOnboarding();

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobError, setDobError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - MINIMUM_AGE);

  async function checkUsername(username: string) {
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    setCheckError(null);
    try {
      const available = await isUsernameAvailable(username);
      setUsernameStatus(available ? "available" : "taken");
    } catch {
      setCheckError("Couldn't check username availability. Try again.");
      setUsernameStatus("idle");
    }
  }

  function handleDobChange(event: unknown, date?: Date) {
    setShowDatePicker(Platform.OS === "ios");
    if (!date) return;
    const iso = toDateOnlyString(date);
    if (!isAtLeastMinimumAge(iso)) {
      setDobError(`You must be at least ${MINIMUM_AGE} to use Dink & Dump.`);
      update({ dateOfBirth: null });
      return;
    }
    setDobError(null);
    update({ dateOfBirth: iso });
  }

  const canContinue =
    state.firstName.trim().length > 0 &&
    usernameStatus === "available" &&
    !!state.dateOfBirth &&
    !dobError;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StepProgressBar currentStep={1} totalSteps={5} label="Basic profile" />
      <Text style={styles.title}>Tell us about you</Text>

      <Text style={styles.label}>First name</Text>
      <TextInput
        style={styles.input}
        placeholder="First name"
        value={state.firstName}
        onChangeText={(v) => update({ firstName: v })}
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={state.username}
        onChangeText={(v) => {
          update({ username: v });
          setUsernameStatus("idle");
        }}
        onBlur={() => state.username && checkUsername(state.username)}
      />
      {usernameStatus === "checking" && <Text style={styles.hint}>Checking availability...</Text>}
      {usernameStatus === "available" && (
        <Text style={styles.success}>Username is available</Text>
      )}
      {usernameStatus === "taken" && (
        <Text style={styles.error}>That username is already taken.</Text>
      )}
      {usernameStatus === "invalid" && (
        <Text style={styles.error}>
          3-30 characters, letters/numbers/underscore only.
        </Text>
      )}
      {checkError && <Text style={styles.error}>{checkError}</Text>}

      <Text style={styles.label}>Date of birth</Text>
      {Platform.OS === "web" ? (
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={state.dateOfBirth ?? ""}
          onChangeText={(v) => {
            update({ dateOfBirth: null });
            setDobError(null);
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
              if (!isAtLeastMinimumAge(v)) {
                setDobError(`You must be at least ${MINIMUM_AGE} to use Dink & Dump.`);
              } else {
                update({ dateOfBirth: v });
              }
            }
          }}
        />
      ) : (
        <>
          <Text style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            {state.dateOfBirth ?? "Select date of birth"}
          </Text>
          {showDatePicker && (
            <DateTimePicker
              value={state.dateOfBirth ? new Date(state.dateOfBirth) : maxDob}
              mode="date"
              maximumDate={maxDob}
              onChange={handleDobChange}
            />
          )}
        </>
      )}
      {dobError && <Text style={styles.error}>{dobError}</Text>}

      <Text style={styles.label}>Gender (optional)</Text>
      <SegmentedChoice
        options={GENDER_OPTIONS}
        value={state.gender}
        onChange={(v) => update({ gender: v })}
        columns={2}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="A short intro for other players"
        multiline
        maxLength={280}
        value={state.bio}
        onChangeText={(v) => update({ bio: v })}
      />

      <WizardNav nextDisabled={!canContinue} onNext={() => router.push("/(onboarding)/location")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  dateButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  hint: { fontSize: 12, color: "#666", marginTop: 4 },
  success: { fontSize: 12, color: "#1a7f37", marginTop: 4 },
  error: { fontSize: 12, color: "#d33", marginTop: 4 },
});
