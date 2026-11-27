/** Deye Cloud Open API v1.0 expects the account password as lowercase SHA-256 hex. */
export async function hashDeyePassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A digest the user already pasted is sent as-is. Anything else is hashed on device. */
export async function deyePasswordField(password: string): Promise<string> {
  const trimmed = password.trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  return hashDeyePassword(trimmed);
}
