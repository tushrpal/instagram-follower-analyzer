import { Hono } from "hono";
import bcrypt from "bcryptjs";
import * as db from "../db.js";
import { signSession, verifySession, getCookieOptions, COOKIE_NAME } from "../session.js";

const auth = new Hono();
const SALT_ROUNDS = 12;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

auth.post("/register", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !emailRegex.test(email)) {
    return c.json({ error: "Valid email is required" }, 400);
  }
  if (!password || password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await db.getUserByEmail(c.env, email.toLowerCase());
  if (existing) return c.json({ error: "An account with this email already exists" }, 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await db.createUser(c.env, email.toLowerCase(), passwordHash);

  const token = await signSession({ userId: user.id, email: user.email }, c.env.SESSION_SECRET);
  const opts = getCookieOptions(c.env);
  c.header("Set-Cookie", serializeCookie(COOKIE_NAME, token, opts));
  return c.json({ id: user.id, email: user.email }, 201);
});

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

  const user = await db.getUserByEmail(c.env, email.toLowerCase());
  if (!user) return c.json({ error: "Invalid email or password" }, 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return c.json({ error: "Invalid email or password" }, 401);

  const token = await signSession({ userId: user.id, email: user.email }, c.env.SESSION_SECRET);
  const opts = getCookieOptions(c.env);
  c.header("Set-Cookie", serializeCookie(COOKIE_NAME, token, opts));
  return c.json({ id: user.id, email: user.email });
});

auth.post("/logout", (c) => {
  c.header("Set-Cookie", serializeCookie(COOKIE_NAME, "", { ...getCookieOptions(c.env), maxAge: 0 }));
  return c.json({ success: true });
});

auth.get("/me", async (c) => {
  const session = await getSession(c);
  if (!session?.userId) return c.json({ error: "Not authenticated" }, 401);
  return c.json({ id: session.userId, email: session.email });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getSession(c) {
  const cookieHeader = c.req.header("Cookie") || "";
  const token = parseCookieValue(cookieHeader, COOKIE_NAME);
  if (!token) return null;
  return verifySession(token, c.env.SESSION_SECRET);
}

function parseCookieValue(header, name) {
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k.trim() === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function serializeCookie(name, value, opts = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) str += `; Max-Age=${opts.maxAge}`;
  if (opts.path) str += `; Path=${opts.path}`;
  if (opts.httpOnly) str += "; HttpOnly";
  if (opts.secure) str += "; Secure";
  if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
  return str;
}

export default auth;
