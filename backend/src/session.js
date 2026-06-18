// Stateless signed-cookie sessions using HMAC-SHA256.
// Replaces express-session + connect-pg-simple.

const COOKIE_NAME = "igfa.sid";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function signSession(payload, secret) {
  const body = btoa(JSON.stringify(payload));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

export async function verifySession(token, secret) {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, body);
  if (sig !== expected) return null;
  try {
    return JSON.parse(atob(body));
  } catch {
    return null;
  }
}

export function getCookieOptions(env) {
  // Pages and Workers are on different subdomains — cookies must be SameSite=None;Secure
  // for cross-origin credentialed requests to work.
  const isProd = env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  };
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
