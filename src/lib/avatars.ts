// Avatars live in a PRIVATE storage bucket. `profiles.avatar_url` stores the
// storage path (e.g. "<uid>/avatar-123.png"); legacy rows may still hold a full
// public URL. Both are resolved to a short-lived signed URL for display.
import { supabase } from "@/integrations/supabase/client";

const SIGNED_TTL = 60 * 60; // 1 hour
const cache = new Map<string, { url: string; expires: number }>();

export const toAvatarPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const marker = "/avatars/";
  const idx = value.indexOf(marker);
  const raw = idx !== -1 ? value.slice(idx + marker.length) : value;
  const path = raw.split("?")[0];
  return path || null;
};

export const getAvatarUrl = async (value: string | null | undefined): Promise<string | null> => {
  const path = toAvatarPath(value);
  if (!path) return null;
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expires: Date.now() + (SIGNED_TTL - 60) * 1000 });
  return data.signedUrl;
};
