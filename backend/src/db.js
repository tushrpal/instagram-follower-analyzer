import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

function getDb(env) {
  return neon(env.DATABASE_URL);
}

// ── Schema ────────────────────────────────────────────────────────────────────

export async function initDatabase(env) {
  const sql = getDb(env);
  await sql`CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS analysis_sessions (
    id TEXT PRIMARY KEY, created_at TIMESTAMP DEFAULT NOW(),
    followers_count INTEGER, following_count INTEGER, mutual_count INTEGER,
    followers_only_count INTEGER, following_only_count INTEGER,
    processed_at TIMESTAMP, name TEXT, user_id INTEGER REFERENCES app_users(id))`;
  await sql`CREATE TABLE IF NOT EXISTS upload_jobs (
    id TEXT PRIMARY KEY, status TEXT DEFAULT 'pending', message TEXT,
    error TEXT, result JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS user_annotations (
    id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, note TEXT,
    tags TEXT[], updated_at TIMESTAMP DEFAULT NOW())`;
  await sql`CREATE INDEX IF NOT EXISTS idx_annotations_username ON user_annotations(username)`;
  await sql`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, session_id TEXT REFERENCES analysis_sessions(id),
    username TEXT, category TEXT, href TEXT, created_at TIMESTAMP DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS follower_events (
    id SERIAL PRIMARY KEY, session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
    event_timestamp TIMESTAMP NOT NULL, followers_count INTEGER NOT NULL,
    following_count INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('follower','following')),
    username TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, username, direction))`;
  await sql`CREATE TABLE IF NOT EXISTS pending_requests (
    id SERIAL PRIMARY KEY, session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
    username TEXT NOT NULL, profile_url TEXT, request_timestamp BIGINT,
    status TEXT DEFAULT 'Pending', created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, username))`;
  await sql`CREATE TABLE IF NOT EXISTS unfollowed_profiles (
    id SERIAL PRIMARY KEY, username TEXT NOT NULL,
    unfollowed_at TIMESTAMP DEFAULT NOW(), last_seen_category TEXT,
    profile_url TEXT,
    source TEXT CHECK(source IN ('detected','imported')) DEFAULT 'detected',
    session_id TEXT REFERENCES analysis_sessions(id))`;
  await sql`CREATE TABLE IF NOT EXISTS relationship_profiles (
    id SERIAL PRIMARY KEY, session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
    username TEXT NOT NULL, display_name TEXT, list_type TEXT NOT NULL,
    profile_url TEXT, fbid TEXT, timestamp BIGINT, created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, username, list_type))`;
  await sql`CREATE INDEX IF NOT EXISTS idx_follower_events_session ON follower_events(session_id, event_timestamp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_session_category ON users(session_id, category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pending_requests_session ON pending_requests(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_unfollowed_profiles_session ON unfollowed_profiles(session_id, unfollowed_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_relationship_profiles_session ON relationship_profiles(session_id, list_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_relationship_profiles_username ON relationship_profiles(username)`;
}

// ── Job queue ─────────────────────────────────────────────────────────────────

export async function createJob(env, sessionId) {
  const sql = getDb(env);
  await sql`INSERT INTO upload_jobs (id, status, message) VALUES (${sessionId}, 'pending', 'Queued…') ON CONFLICT (id) DO NOTHING`;
}

export async function updateJob(env, sessionId, status, message, error = null, result = null) {
  const sql = getDb(env);
  await sql`UPDATE upload_jobs SET status=${status}, message=${message}, error=${error}, result=${result ? JSON.stringify(result) : null}::jsonb, updated_at=NOW() WHERE id=${sessionId}`;
}

export async function getJob(env, sessionId) {
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM upload_jobs WHERE id=${sessionId}`;
  return rows[0] || null;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function createUser(env, email, passwordHash) {
  const sql = getDb(env);
  const rows = await sql`INSERT INTO app_users (email, password_hash) VALUES (${email}, ${passwordHash}) RETURNING id, email, created_at`;
  return rows[0];
}

export async function getUserByEmail(env, email) {
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM app_users WHERE email=${email}`;
  return rows[0] || null;
}

export async function getUserById(env, id) {
  const sql = getDb(env);
  const rows = await sql`SELECT id, email, created_at FROM app_users WHERE id=${id}`;
  return rows[0] || null;
}

// ── Analysis sessions ─────────────────────────────────────────────────────────

export async function saveAnalysis(env, sessionId, analysisData, userId = null) {
  const sql = getDb(env);
  const { followers, following, mutual, followersOnly, followingOnly } = analysisData;
  await sql`INSERT INTO analysis_sessions (id, followers_count, following_count, mutual_count, followers_only_count, following_only_count, processed_at, user_id)
    VALUES (${sessionId}, ${followers.length}, ${following.length}, ${mutual.length}, ${followersOnly.length}, ${followingOnly.length}, NOW(), ${userId})`;
}

export async function getAnalysis(env, sessionId) {
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM analysis_sessions WHERE id=${sessionId}`;
  return rows[0] || null;
}

export async function getAnalysisSessions(env, limit = 50, userId = null) {
  const sql = getDb(env);
  if (userId !== null) {
    return sql`SELECT * FROM analysis_sessions WHERE user_id=${userId} ORDER BY created_at DESC LIMIT ${limit}`;
  }
  return sql`SELECT * FROM analysis_sessions ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function updateSessionName(env, sessionId, name) {
  const sql = getDb(env);
  await sql`UPDATE analysis_sessions SET name=${name} WHERE id=${sessionId}`;
}

// ── Users (followers/following) ───────────────────────────────────────────────

export async function getUsers(env, sessionId, category = null, search = null) {
  const sql = getDb(env);
  if (category && search) return sql`SELECT * FROM users WHERE session_id=${sessionId} AND category=${category} AND username ILIKE ${'%' + search + '%'} ORDER BY username`;
  if (category) return sql`SELECT * FROM users WHERE session_id=${sessionId} AND category=${category} ORDER BY username`;
  if (search) return sql`SELECT * FROM users WHERE session_id=${sessionId} AND username ILIKE ${'%' + search + '%'} ORDER BY username`;
  return sql`SELECT * FROM users WHERE session_id=${sessionId} ORDER BY username`;
}

export async function saveBatchUsers(env, sessionId, users, category) {
  if (!users || users.length === 0) return;
  const sql = getDb(env);
  const rows = users.map((u) => ({ session_id: sessionId, username: u.value || u.username, category, href: u.href || null }));
  // Chunk to avoid hitting Neon's parameter limit (~65k)
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const usernames = chunk.map((r) => r.username);
    const hrefs = chunk.map((r) => r.href);
    await sql`INSERT INTO users (session_id, username, category, href) SELECT ${sessionId}, u, ${category}, h FROM unnest(${usernames}::text[], ${hrefs}::text[]) AS t(u, h)`;
  }
}

// ── Follower events ───────────────────────────────────────────────────────────

function toEventTimestamp(ts) {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "number") return new Date(ts * 1000).toISOString();
  const unix = parseInt(ts);
  return !isNaN(unix) ? new Date(unix * 1000).toISOString() : new Date(ts).toISOString();
}

export async function saveBatchFollowerEvents(env, sessionId, events) {
  if (!events || events.length === 0) return;
  const sql = getDb(env);
  for (let i = 0; i < events.length; i += 500) {
    const chunk = events.slice(i, i + 500);
    const timestamps = chunk.map((e) => toEventTimestamp(e.timestamp));
    const followersCounts = chunk.map((e) => Math.max(0, e.followersCount || 0));
    const followingCounts = chunk.map((e) => Math.max(0, e.followingCount || 0));
    const directions = chunk.map((e) => e.direction);
    const usernames = chunk.map((e) => e.username);
    await sql`INSERT INTO follower_events (session_id, event_timestamp, followers_count, following_count, direction, username)
      SELECT ${sessionId}, ts::timestamptz, fc, fwc, dir, u
      FROM unnest(${timestamps}::text[], ${followersCounts}::int[], ${followingCounts}::int[], ${directions}::text[], ${usernames}::text[]) AS t(ts, fc, fwc, dir, u)
      ON CONFLICT DO NOTHING`;
  }
}

export async function getTimelineData(env, sessionId) {
  const sql = getDb(env);
  const rows = await sql`
    SELECT fe.event_timestamp, fe.followers_count, fe.following_count, fe.direction, fe.username, u.href
    FROM follower_events fe
    LEFT JOIN users u ON u.session_id = fe.session_id AND u.username = fe.username
    WHERE fe.session_id=${sessionId} ORDER BY fe.event_timestamp ASC`;
  if (!rows || rows.length === 0) return { followEvents: [], statistics: { totalFollowers: 0, totalFollowing: 0 } };
  return {
    followEvents: rows.map((r) => ({ timestamp: new Date(r.event_timestamp).toISOString(), username: r.username, direction: r.direction, followersCount: r.followers_count, followingCount: r.following_count, href: r.href })),
    statistics: { totalFollowers: rows[rows.length - 1].followers_count, totalFollowing: rows[rows.length - 1].following_count },
  };
}

// ── Pending requests ──────────────────────────────────────────────────────────

export async function savePendingRequests(env, sessionId, requests) {
  if (!requests || requests.length === 0) return;
  const sql = getDb(env);
  const usernames = [], hrefs = [], timestamps = [];
  for (const request of requests) {
    let username = null, href = null, timestamp = null;
    if (request.string_list_data?.[0]) {
      const sld = request.string_list_data[0];
      username = sld.value; href = sld.href || null; timestamp = sld.timestamp || null;
    } else if (Array.isArray(request.label_values)) {
      username = request.label_values.find((lv) => lv.label === "Username")?.value || null;
      href = request.label_values.find((lv) => lv.label === "URL")?.value || null;
      timestamp = request.timestamp || null;
    } else {
      username = request.title || request.value || request.username || null;
      href = request.href || null; timestamp = request.timestamp || null;
    }
    if (username) { usernames.push(username); hrefs.push(href); timestamps.push(timestamp); }
  }
  if (usernames.length === 0) return;
  await sql`INSERT INTO pending_requests (session_id, username, profile_url, request_timestamp)
    SELECT ${sessionId}, u, h, ts
    FROM unnest(${usernames}::text[], ${hrefs}::text[], ${timestamps}::bigint[]) AS t(u, h, ts)
    ON CONFLICT (session_id, username) DO UPDATE SET profile_url=EXCLUDED.profile_url, request_timestamp=EXCLUDED.request_timestamp`;
}

export async function getPendingRequests(env, sessionId) {
  const sql = getDb(env);
  return sql`SELECT id, username, profile_url,
    CASE WHEN request_timestamp IS NOT NULL THEN to_timestamp(request_timestamp)::text ELSE NULL END as request_date,
    status, created_at FROM pending_requests WHERE session_id=${sessionId} ORDER BY request_timestamp DESC NULLS LAST`;
}

// ── Unfollowed profiles ───────────────────────────────────────────────────────

export async function addUnfollowedProfile(env, sessionId, username, lastSeenCategory, profileUrl = null, timestamp = null, source = "detected") {
  const sql = getDb(env);
  const unfollowedAt = timestamp ? new Date(timestamp * 1000).toISOString() : null;
  await sql`INSERT INTO unfollowed_profiles (username, last_seen_category, session_id, profile_url, unfollowed_at, source)
    VALUES (${username}, ${lastSeenCategory}, ${sessionId}, ${profileUrl}, COALESCE(${unfollowedAt}::timestamp, NOW()), ${source})`;
}

export async function getUnfollowedProfiles(env, sessionId, limit = 20, offset = 0, search = null) {
  const sql = getDb(env);
  if (search) return sql`SELECT up.id, up.username, up.unfollowed_at, up.last_seen_category, COALESCE(up.profile_url, u.href) as profile_url, up.source, up.unfollowed_at as unfollowed_date FROM unfollowed_profiles up LEFT JOIN users u ON u.username=up.username AND u.session_id=up.session_id WHERE up.session_id=${sessionId} AND up.username ILIKE ${'%' + search + '%'} ORDER BY up.unfollowed_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return sql`SELECT up.id, up.username, up.unfollowed_at, up.last_seen_category, COALESCE(up.profile_url, u.href) as profile_url, up.source, up.unfollowed_at as unfollowed_date FROM unfollowed_profiles up LEFT JOIN users u ON u.username=up.username AND u.session_id=up.session_id WHERE up.session_id=${sessionId} ORDER BY up.unfollowed_at DESC LIMIT ${limit} OFFSET ${offset}`;
}

export async function getUnfollowedCount(env, sessionId) {
  const sql = getDb(env);
  const rows = await sql`SELECT COUNT(*) as count FROM unfollowed_profiles WHERE session_id=${sessionId}`;
  return rows[0] ? parseInt(rows[0].count) : 0;
}

export async function getUnfollowedProfilesCount(env, sessionId, search = null) {
  const sql = getDb(env);
  if (search) {
    const rows = await sql`SELECT COUNT(*) as count FROM unfollowed_profiles WHERE session_id=${sessionId} AND username ILIKE ${'%' + search + '%'}`;
    return rows[0] ? parseInt(rows[0].count) : 0;
  }
  const rows = await sql`SELECT COUNT(*) as count FROM unfollowed_profiles WHERE session_id=${sessionId}`;
  return rows[0] ? parseInt(rows[0].count) : 0;
}

// ── Relationship profiles ─────────────────────────────────────────────────────

export async function saveRelationshipProfiles(env, sessionId, profiles) {
  if (!profiles || profiles.length === 0) return;
  const sql = getDb(env);
  const usernames = profiles.map((p) => p.username);
  const displayNames = profiles.map((p) => p.displayName || null);
  const listTypes = profiles.map((p) => p.listType);
  const profileUrls = profiles.map((p) => p.profileUrl || null);
  const fbids = profiles.map((p) => p.fbid || null);
  const timestamps = profiles.map((p) => p.timestamp || null);
  await sql`INSERT INTO relationship_profiles (session_id, username, display_name, list_type, profile_url, fbid, timestamp)
    SELECT ${sessionId}, u, dn, lt, pu, fb, ts
    FROM unnest(${usernames}::text[], ${displayNames}::text[], ${listTypes}::text[], ${profileUrls}::text[], ${fbids}::text[], ${timestamps}::bigint[]) AS t(u, dn, lt, pu, fb, ts)
    ON CONFLICT DO NOTHING`;
}

export async function getRelationshipProfiles(env, sessionId, listType, limit = 20, offset = 0, search = null) {
  const sql = getDb(env);
  if (search) return sql`SELECT * FROM relationship_profiles WHERE session_id=${sessionId} AND list_type=${listType} AND username ILIKE ${'%' + search + '%'} ORDER BY timestamp DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`;
  return sql`SELECT * FROM relationship_profiles WHERE session_id=${sessionId} AND list_type=${listType} ORDER BY timestamp DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`;
}

export async function getRelationshipProfileCounts(env, sessionId) {
  const sql = getDb(env);
  const rows = await sql`SELECT list_type, COUNT(*) as count FROM relationship_profiles WHERE session_id=${sessionId} GROUP BY list_type`;
  const counts = {};
  (rows || []).forEach((r) => { counts[r.list_type] = parseInt(r.count); });
  return counts;
}

export async function getRelationshipProfileCount(env, sessionId, listType, search = null) {
  const sql = getDb(env);
  if (search) {
    const rows = await sql`SELECT COUNT(*) as count FROM relationship_profiles WHERE session_id=${sessionId} AND list_type=${listType} AND username ILIKE ${'%' + search + '%'}`;
    return rows[0] ? parseInt(rows[0].count) : 0;
  }
  const rows = await sql`SELECT COUNT(*) as count FROM relationship_profiles WHERE session_id=${sessionId} AND list_type=${listType}`;
  return rows[0] ? parseInt(rows[0].count) : 0;
}

// ── Annotations ───────────────────────────────────────────────────────────────

export async function getAnnotation(env, username) {
  const sql = getDb(env);
  const rows = await sql`SELECT username, note, tags, updated_at FROM user_annotations WHERE username=${username}`;
  return rows[0] || null;
}

export async function upsertAnnotation(env, username, note, tags) {
  const sql = getDb(env);
  await sql`INSERT INTO user_annotations (username, note, tags, updated_at) VALUES (${username}, ${note || null}, ${tags || []}, NOW())
    ON CONFLICT (username) DO UPDATE SET note=${note || null}, tags=${tags || []}, updated_at=NOW()`;
}

// ── Raw query ─────────────────────────────────────────────────────────────────

export async function queryRaw(env, sqlStr, params = []) {
  const sql = getDb(env);
  return sql(sqlStr, params);
}
