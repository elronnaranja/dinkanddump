import { supabase } from "./client";
import type { ProfileRow, PublicProfileRow } from "../../types/database";

export async function getOwnProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublicProfile(userId: string): Promise<PublicProfileRow | null> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at" | "location">;

export async function upsertProfile(profile: ProfileInsert): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export type ProfileUpdate = Partial<
  Omit<ProfileRow, "id" | "created_at" | "updated_at" | "location">
>;

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function setOnboardingCompleted(userId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: completed })
    .eq("id", userId);

  if (error) throw error;
}
