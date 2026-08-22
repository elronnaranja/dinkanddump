/**
 * App-level domain types used by hooks/services/components. These are
 * distinct from the raw DB row types in database.ts so that UI code isn't
 * coupled directly to SQL column shapes.
 */

import type {
  DiscoveryCandidateRow,
  GamePreference,
  MatchStatus,
  PlayPreference,
  SkillLevel,
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
  };
}

export interface DiscoveryFilters {
  maxDistanceKm: number;
  skillMin: SkillLevel;
  skillMax: SkillLevel;
  gamePreference: GamePreference | null;
  playPreference: PlayPreference | null;
  limit: number;
}

export interface MatchResult {
  matched: boolean;
  matchId: string | null;
}

export interface MatchSummary {
  id: string;
  otherUserId: string;
  status: MatchStatus;
  matchedAt: string;
}

export interface ConversationSummary {
  id: string;
  matchId: string;
  otherUserId: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}
