import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  DominantHand,
  GamePreference,
  Gender,
  PlayPreference,
  PlayingFrequency,
  SkillLevel,
  YearsPlaying,
} from "../types/database";

/**
 * In-memory state shared across the 5 onboarding steps. The `profiles` row
 * has several NOT NULL columns with no DB default (username, first_name,
 * date_of_birth, skill_level), so we can't upsert a valid row until the
 * pickleball-profile step (step 3) is complete. Steps 1-2 just accumulate
 * data here; step 3 performs the actual upsert.
 */
export interface OnboardingState {
  // Step 1
  firstName: string;
  username: string;
  dateOfBirth: string | null; // YYYY-MM-DD
  gender: Gender | null;
  bio: string;
  // Step 2
  city: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  locationPermissionDenied: boolean;
  // Step 3
  skillLevel: SkillLevel | null;
  gamePreference: GamePreference;
  playPreference: PlayPreference;
  dominantHand: DominantHand;
  playingFrequency: PlayingFrequency;
  yearsPlaying: YearsPlaying | null;
  favoriteShot: string;
  playStyle: string;
  duprRating: string; // kept as string for the input, parsed on submit
}

const initialState: OnboardingState = {
  firstName: "",
  username: "",
  dateOfBirth: null,
  gender: null,
  bio: "",
  city: "",
  region: "",
  country: "",
  latitude: null,
  longitude: null,
  locationPermissionDenied: false,
  skillLevel: null,
  gamePreference: "both",
  playPreference: "both",
  dominantHand: "right",
  playingFrequency: "once_per_week",
  yearsPlaying: null,
  favoriteShot: "",
  playStyle: "",
  duprRating: "",
};

interface OnboardingContextValue {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  /** Set once step 3 has successfully created the profiles row. */
  profileCreated: boolean;
  setProfileCreated: (value: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [profileCreated, setProfileCreated] = useState(false);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      update: (patch) => setState((prev) => ({ ...prev, ...patch })),
      profileCreated,
      setProfileCreated,
    }),
    [state, profileCreated]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
