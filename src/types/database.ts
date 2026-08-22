/**
 * Hand-written TypeScript types mirroring the Postgres schema defined in
 * supabase/migrations/. These are NOT auto-generated (Supabase CLI codegen
 * can replace this file later once a real project exists), but the shapes
 * below are kept in lockstep with the SQL migrations.
 */

export type SkillLevel =
  | "beginner"
  | "2.0"
  | "2.5"
  | "3.0"
  | "3.5"
  | "4.0"
  | "4.5"
  | "5.0+";

export type GamePreference = "singles" | "doubles" | "both";
export type PlayPreference = "competitive" | "casual" | "both";
export type DominantHand = "right" | "left" | "ambidextrous";
export type PlayingFrequency =
  | "occasionally"
  | "once_per_week"
  | "two_to_three_per_week"
  | "four_plus_per_week";
export type YearsPlaying = "less_than_1" | "one_to_two" | "three_to_five" | "five_plus";
export type Gender = "male" | "female" | "non_binary" | "other" | "prefer_not_to_say";

export type VideoStatus = "processing" | "active" | "failed";
export type SwipeAction = "dink" | "dump";
export type MatchStatus = "active" | "unmatched" | "blocked";
export type ReportTargetType = "profile" | "photo" | "video" | "message";

export interface ProfileRow {
  id: string; // uuid, references auth.users
  username: string;
  first_name: string;
  date_of_birth: string; // date (YYYY-MM-DD)
  gender: Gender | null;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  // `location` (geography(Point,4326)) is maintained server-side by a
  // trigger from latitude/longitude and is not typically read directly
  // by the client, but is included here for completeness.
  location: unknown | null;
  skill_level: SkillLevel;
  dupr_rating: number | null;
  game_preference: GamePreference;
  play_preference: PlayPreference;
  dominant_hand: DominantHand;
  playing_frequency: PlayingFrequency;
  years_playing: YearsPlaying;
  favorite_shot: string | null;
  play_style: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfilePhotoRow {
  id: string;
  user_id: string;
  storage_path: string;
  position: number; // 0-4
  created_at: string;
}

export interface ProfileVideoRow {
  id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  duration: number | null; // seconds
  status: VideoStatus;
  created_at: string;
}

export interface SwipeRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  action: SwipeAction;
  created_at: string;
  updated_at: string;
}

export interface MatchRow {
  id: string;
  user_1_id: string;
  user_2_id: string;
  matched_at: string;
  status: MatchStatus;
}

export interface ConversationRow {
  id: string;
  match_id: string;
  created_at: string;
}

export interface ConversationMemberRow {
  conversation_id: string;
  user_id: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface BlockRow {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string | null;
  created_at: string;
}

/**
 * Row shape of the `public_profiles` view (see migrations 0009, 0012).
 *
 * NOTE: the fields below `play_preference` were added by migration 0012.
 * Until that migration has been applied to the live Supabase project,
 * PostgREST will simply omit those keys from the response object (missing,
 * not null) — callers should treat them as possibly-undefined at runtime
 * despite the non-optional typing here, e.g. via `row.bio ?? null` rather
 * than assuming presence.
 */
export interface PublicProfileRow {
  id: string;
  first_name: string;
  city: string | null;
  region: string | null;
  skill_level: SkillLevel;
  game_preference: GamePreference;
  play_preference: PlayPreference;
  dominant_hand: DominantHand;
  playing_frequency: PlayingFrequency;
  years_playing: YearsPlaying;
  favorite_shot: string | null;
  play_style: string | null;
  bio: string | null;
  dupr_rating: number | null;
  age: number;
}

/** Return row shape of the `get_discovery_candidates` RPC (migration 0008). */
export interface DiscoveryCandidateRow {
  id: string;
  first_name: string;
  age: number;
  skill_level: SkillLevel;
  city: string | null;
  region: string | null;
  distance_km: number;
  primary_photo_path: string | null;
}

/** Return shape of the `record_swipe` RPC (migration 0007). */
export interface RecordSwipeResult {
  matched: boolean;
  match_id: string | null;
}

/** Return row shape of the `get_match_distances` RPC (migration 0013). */
export interface MatchDistanceRow {
  match_id: string;
  other_user_id: string;
  distance_km: number | null;
}

type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Nullable<
          Omit<ProfileRow, "location" | "created_at" | "updated_at">,
          | "gender"
          | "bio"
          | "city"
          | "region"
          | "country"
          | "latitude"
          | "longitude"
          | "dupr_rating"
          | "game_preference"
          | "play_preference"
          | "dominant_hand"
          | "playing_frequency"
          | "years_playing"
          | "favorite_shot"
          | "play_style"
          | "onboarding_completed"
        >;
        Update: Partial<Omit<ProfileRow, "id" | "location" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      profile_photos: {
        Row: ProfilePhotoRow;
        Insert: Omit<ProfilePhotoRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ProfilePhotoRow, "id">>;
        Relationships: [];
      };
      profile_videos: {
        Row: ProfileVideoRow;
        Insert: Nullable<
          Omit<ProfileVideoRow, "id" | "created_at">,
          "thumbnail_path" | "duration" | "status"
        > & { id?: string; created_at?: string };
        Update: Partial<Omit<ProfileVideoRow, "id">>;
        Relationships: [];
      };
      swipes: {
        Row: SwipeRow;
        Insert: Omit<SwipeRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SwipeRow, "id">>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: Nullable<Omit<MatchRow, "id" | "matched_at">, "status"> & {
          id?: string;
          matched_at?: string;
        };
        Update: Partial<Omit<MatchRow, "id">>;
        Relationships: [];
      };
      conversations: {
        Row: ConversationRow;
        Insert: Omit<ConversationRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ConversationRow, "id">>;
        Relationships: [];
      };
      conversation_members: {
        Row: ConversationMemberRow;
        Insert: ConversationMemberRow;
        Update: Partial<ConversationMemberRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: Nullable<Omit<MessageRow, "id" | "created_at">, "read_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<MessageRow, "id">>;
        Relationships: [];
      };
      blocks: {
        Row: BlockRow;
        Insert: Omit<BlockRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<BlockRow, "id">>;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: Nullable<Omit<ReportRow, "id" | "created_at">, "details"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ReportRow, "id">>;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: { Row: PublicProfileRow; Relationships: [] };
    };
    Functions: {
      record_swipe: {
        Args: { to_user_id: string; p_action: string };
        Returns: RecordSwipeResult;
      };
      get_discovery_candidates: {
        Args: {
          p_max_distance_km: number;
          p_skill_min: string;
          p_skill_max: string;
          p_game_pref: string | null;
          p_play_pref: string | null;
          p_limit: number;
        };
        Returns: DiscoveryCandidateRow[];
      };
      get_match_distances: {
        Args: Record<string, never>;
        Returns: MatchDistanceRow[];
      };
    };
  };
}
