/**
 * App-level domain types used by hooks/services/components. These are
 * distinct from the raw DB row types in database.ts so that UI code isn't
 * coupled directly to SQL column shapes.
 */

import type {
  DiscoveryCandidateRow,
  DominantHand,
  GamePreference,
  Gender,
  MatchStatus,
  MessageRow,
  PlayingFrequency,
  PlayPreference,
  PublicProfileRow,
  SkillLevel,
  YearsPlaying,
} from "./database";

export interface DiscoveryCandidate {
  id: string;
  firstName: string;
  age: number;
  skillLevel: SkillLevel;
  city: string | null;
  region: string | null;
  distanceKm: number;
  primaryPhotoUrl: string | null;
  // The fields below come from a second-pass enrichment against
  // public_profiles (see mergePublicProfileIntoCandidate) rather than the
  // get_discovery_candidates RPC itself, so they start out null and are
  // filled in once that lookup resolves.
  gamePreference: GamePreference | null;
  playPreference: PlayPreference | null;
  bio: string | null;
  duprRating: number | null;
  playStyle: string | null;
  playingFrequency: PlayingFrequency | null;
  yearsPlaying: YearsPlaying | null;
  favoriteShot: string | null;
  dominantHand: DominantHand | null;
  emailVerified: boolean;
}

export function mapDiscoveryCandidateRow(
  row: DiscoveryCandidateRow,
  photoUrlResolver: (path: string | null) => string | null
): DiscoveryCandidate {
  return {
    id: row.id,
    firstName: row.first_name,
    age: row.age,
    skillLevel: row.skill_level,
    city: row.city,
    region: row.region,
    distanceKm: row.distance_km,
    primaryPhotoUrl: photoUrlResolver(row.primary_photo_path),
    gamePreference: null,
    playPreference: null,
    bio: null,
    duprRating: null,
    playStyle: null,
    playingFrequency: null,
    yearsPlaying: null,
    favoriteShot: null,
    dominantHand: null,
    emailVerified: row.email_verified,
  };
}

/**
 * Merges the extra pickleball-profile fields (game/play preference, bio,
 * DUPR, etc.) from a `public_profiles` row into a discovery candidate.
 * Fields added by migration 0012 may be `undefined` at runtime if that
 * migration hasn't been applied yet to the linked Supabase project — this
 * degrades gracefully to `null` (field just doesn't render) rather than
 * throwing.
 */
export function mergePublicProfileIntoCandidate(
  candidate: DiscoveryCandidate,
  profile: PublicProfileRow | undefined
): DiscoveryCandidate {
  if (!profile) return candidate;
  return {
    ...candidate,
    gamePreference: profile.game_preference ?? null,
    playPreference: profile.play_preference ?? null,
    bio: profile.bio ?? null,
    duprRating: profile.dupr_rating ?? null,
    playStyle: profile.play_style ?? null,
    playingFrequency: profile.playing_frequency ?? null,
    yearsPlaying: profile.years_playing ?? null,
    favoriteShot: profile.favorite_shot ?? null,
    dominantHand: profile.dominant_hand ?? null,
  };
}

export interface DiscoveryFilters {
  maxDistanceKm: number;
  skillMin: SkillLevel;
  skillMax: SkillLevel;
  gamePreference: GamePreference | null;
  playPreference: PlayPreference | null;
  /** Who to show. null = everyone, regardless of gender. */
  genderPreference: Gender | null;
  limit: number;
}

export interface MatchResult {
  matched: boolean;
  matchId: string | null;
}

/**
 * View-model for a single row on the Matches (and, filtered, Messages)
 * screens. Composed in useMatches from several sources: matches +
 * conversations + public_profiles + primary photo + latest message per
 * conversation (see src/hooks/useMatches.ts for how these are combined) —
 * there's no single table/view this maps 1:1 from.
 */
export interface MatchListItem {
  id: string; // match id
  conversationId: string | null;
  otherUserId: string;
  otherFirstName: string;
  otherAge: number | null;
  otherPhotoUrl: string | null;
  skillLevel: SkillLevel | null;
  distanceKm: number | null;
  status: MatchStatus;
  matchedAt: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  emailVerified: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export function mapMessageRowToChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}
