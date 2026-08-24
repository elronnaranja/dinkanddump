import { useState } from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { StepProgressBar } from "../../src/components/ui/StepProgressBar";
import { WizardNav } from "../../src/components/ui/WizardNav";
import { useOnboarding } from "../../src/context/OnboardingContext";

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, update } = useOnboarding();
  const [requesting, setRequesting] = useState(false);
  const [permissionState, setPermissionState] = useState<
    "unknown" | "granted" | "denied"
  >(state.locationPermissionDenied ? "denied" : "unknown");
  const [error, setError] = useState<string | null>(null);

  async function requestLocation() {
    setError(null);
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionState("denied");
        update({ locationPermissionDenied: true, latitude: null, longitude: null });
        return;
      }

      setPermissionState("granted");
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      update({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: place?.city ?? place?.subregion ?? "",
        region: place?.region ?? "",
        country: place?.country ?? "",
        locationPermissionDenied: false,
      });
    } catch {
      setError("Couldn't determine your location. You can enter it manually below.");
      setPermissionState("denied");
      update({ locationPermissionDenied: true });
    } finally {
      setRequesting(false);
    }
  }

  const manualEntry = permissionState === "denied";
  const canContinue =
    permissionState === "granted"
      ? true
      : state.city.trim().length > 0 && state.country.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 24 }]}>
      <StepProgressBar currentStep={2} totalSteps={5} label="Location" />
      <Text style={styles.title}>Where do you play?</Text>
      <Text style={styles.body}>
        We use your location to find nearby players and calculate distance. Your exact
        coordinates are never shown to other players — only your city and region.
      </Text>

      {permissionState !== "granted" && (
        <View style={styles.permissionBox}>
          <Text
            style={styles.permissionButton}
            onPress={requestLocation}
          >
            {requesting ? "Requesting..." : "Share my location"}
          </Text>
          {requesting && <ActivityIndicator style={{ marginTop: 8 }} />}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {permissionState === "granted" ? (
        <View style={styles.confirmedBox}>
          <Text style={styles.confirmedText}>
            Location detected: {state.city || "Unknown city"}
            {state.region ? `, ${state.region}` : ""}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="City"
            value={state.city}
            onChangeText={(v) => update({ city: v })}
          />
          <Text style={styles.label}>Region / State</Text>
          <TextInput
            style={styles.input}
            placeholder="Region or state"
            value={state.region}
            onChangeText={(v) => update({ region: v })}
          />
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            placeholder="Country"
            value={state.country}
            onChangeText={(v) => update({ country: v })}
          />
          {manualEntry && (
            <Text style={styles.hint}>
              Location permission was denied. You can still play — enter your location
              manually. Precise distance matching won't be available.
            </Text>
          )}
        </>
      )}

      <WizardNav
        onBack={() => router.back()}
        nextDisabled={!canContinue}
        onNext={() => router.push("/(onboarding)/pickleball-profile")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  permissionBox: { alignItems: "center", marginBottom: 12 },
  permissionButton: {
    backgroundColor: "#1a7f37",
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  confirmedBox: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  confirmedText: { color: "#1a7f37", fontSize: 14 },
  hint: { fontSize: 12, color: "#666", marginTop: 12 },
  error: { fontSize: 12, color: "#d33", marginBottom: 8 },
});
