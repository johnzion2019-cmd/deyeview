import { Preferences } from "@capacitor/preferences";
import { normalizeProfile } from "@/domain/profile";
import type { PlantProfile } from "@/domain/types";

const PROFILE_KEY = "deyeview.profile.v1";

export async function loadProfile(): Promise<PlantProfile | null> {
  const { value } = await Preferences.get({ key: PROFILE_KEY });
  if (!value) return null;
  try {
    return normalizeProfile(JSON.parse(value));
  } catch {
    return null;
  }
}

export async function saveProfile(profile: PlantProfile): Promise<void> {
  await Preferences.set({ key: PROFILE_KEY, value: JSON.stringify(profile) });
}

export async function clearLocalData(): Promise<void> {
  await Preferences.remove({ key: PROFILE_KEY });
  await Preferences.clear();
}
