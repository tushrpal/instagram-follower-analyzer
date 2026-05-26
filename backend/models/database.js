const { Pool } = require("pg");

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
    });

    await this.pool.query("SELECT NOW()");
    console.log("📁 Connected to PostgreSQL database");
  }

  async createTables() {
    const ddl = `
      CREATE TABLE IF NOT EXISTS analysis_sessions (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        followers_count INTEGER,
        following_count INTEGER,
        mutual_count INTEGER,
        followers_only_count INTEGER,
        following_only_count INTEGER,
        processed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        session_id TEXT REFERENCES analysis_sessions(id),
        username TEXT,
        category TEXT,
        href TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS follower_events (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
        event_timestamp TIMESTAMP NOT NULL,
        followers_count INTEGER NOT NULL,
        following_count INTEGER NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('follower', 'following')),
        username TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(session_id, username, direction)
      );

      CREATE TABLE IF NOT EXISTS pending_requests (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
        username TEXT NOT NULL,
        profile_url TEXT,
        request_timestamp BIGINT,
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(session_id, username)
      );

      CREATE TABLE IF NOT EXISTS unfollowed_profiles (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        unfollowed_at TIMESTAMP DEFAULT NOW(),
        last_seen_category TEXT,
        profile_url TEXT,
        source TEXT CHECK(source IN ('detected', 'imported')) DEFAULT 'detected',
        session_id TEXT REFERENCES analysis_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS relationship_profiles (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
        username TEXT NOT NULL,
        display_name TEXT,
        list_type TEXT NOT NULL,
        profile_url TEXT,
        fbid TEXT,
        timestamp BIGINT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(session_id, username, list_type)
      );

      CREATE INDEX IF NOT EXISTS idx_follower_events_session ON follower_events(session_id, event_timestamp);
      CREATE INDEX IF NOT EXISTS idx_users_session_category ON users(session_id, category);
      CREATE INDEX IF NOT EXISTS idx_pending_requests_session ON pending_requests(session_id);
      CREATE INDEX IF NOT EXISTS idx_unfollowed_profiles_session ON unfollowed_profiles(session_id, unfollowed_at);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_unfollowed_profiles_username ON unfollowed_profiles(username);
      CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON analysis_sessions(created_at);
      CREATE INDEX IF NOT EXISTS idx_follower_events_created_at ON follower_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_unfollowed_profiles_unfollowed_at ON unfollowed_profiles(unfollowed_at);
      CREATE INDEX IF NOT EXISTS idx_users_session_username ON users(session_id, username);
      CREATE INDEX IF NOT EXISTS idx_follower_events_session_direction ON follower_events(session_id, direction);
      CREATE INDEX IF NOT EXISTS idx_relationship_profiles_session ON relationship_profiles(session_id, list_type);
      CREATE INDEX IF NOT EXISTS idx_relationship_profiles_username ON relationship_profiles(username);
    `;

    await this.pool.query(ddl);
  }

  async getUnfollowedCount(sessionId) {
    const { rows } = await this.pool.query(
      "SELECT COUNT(*) as count FROM unfollowed_profiles WHERE session_id = $1",
      [sessionId]
    );
    return rows[0] ? parseInt(rows[0].count) : 0;
  }

  async getUnfollowedProfiles(sessionId, limit = 20, offset = 0, search = null) {
    let query = `
      SELECT
        up.id,
        up.username,
        up.unfollowed_at,
        up.last_seen_category,
        COALESCE(up.profile_url, u.href) as profile_url,
        up.source,
        up.unfollowed_at as unfollowed_date
      FROM unfollowed_profiles up
      LEFT JOIN users u ON u.username = up.username AND u.session_id = up.session_id
      WHERE up.session_id = $1`;

    const params = [sessionId];
    let paramIdx = 2;

    if (search) {
      query += ` AND up.username ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY up.unfollowed_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const { rows } = await this.pool.query(query, params);
    return rows || [];
  }

  async saveAnalysis(sessionId, analysisData) {
    const { followers, following, mutual, followersOnly, followingOnly } = analysisData;
    await this.pool.query(
      `INSERT INTO analysis_sessions
       (id, followers_count, following_count, mutual_count, followers_only_count, following_only_count, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [sessionId, followers.length, following.length, mutual.length, followersOnly.length, followingOnly.length]
    );
  }

  async saveBatchUsers(sessionId, users, category) {
    if (!users || users.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const user of users) {
        await client.query(
          "INSERT INTO users (session_id, username, category, href) VALUES ($1, $2, $3, $4)",
          [sessionId, user.value || user.username, category, user.href]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async saveBatchFollowerEvents(sessionId, events) {
    if (!events || events.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const event of events) {
        let eventTimestamp;
        try {
          if (typeof event.timestamp === "number") {
            eventTimestamp = new Date(event.timestamp * 1000).toISOString();
          } else if (event.timestamp instanceof Date) {
            eventTimestamp = event.timestamp.toISOString();
          } else if (typeof event.timestamp === "string") {
            const unix = parseInt(event.timestamp);
            eventTimestamp = !isNaN(unix)
              ? new Date(unix * 1000).toISOString()
              : new Date(event.timestamp).toISOString();
          } else {
            eventTimestamp = new Date().toISOString();
          }
        } catch {
          eventTimestamp = new Date().toISOString();
        }

        await client.query(
          `INSERT INTO follower_events
           (session_id, event_timestamp, followers_count, following_count, direction, username)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            sessionId,
            eventTimestamp,
            Math.max(0, event.followersCount || 0),
            Math.max(0, event.followingCount || 0),
            event.direction,
            event.username,
          ]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getAnalysis(sessionId) {
    const { rows } = await this.pool.query(
      "SELECT * FROM analysis_sessions WHERE id = $1",
      [sessionId]
    );
    return rows[0] || null;
  }

  async getUsers(sessionId, category = null, search = null) {
    let query = "SELECT * FROM users WHERE session_id = $1";
    const params = [sessionId];
    let paramIdx = 2;

    if (category) {
      query += ` AND category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }

    if (search) {
      query += ` AND username ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += " ORDER BY username";

    const { rows } = await this.pool.query(query, params);
    return rows;
  }

  async saveRelationshipProfiles(sessionId, profiles) {
    if (!profiles || profiles.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const p of profiles) {
        await client.query(
          `INSERT INTO relationship_profiles
           (session_id, username, display_name, list_type, profile_url, fbid, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [sessionId, p.username, p.displayName || null, p.listType, p.profileUrl || null, p.fbid || null, p.timestamp || null]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getRelationshipProfiles(sessionId, listType, limit = 20, offset = 0, search = null) {
    let query = "SELECT * FROM relationship_profiles WHERE session_id = $1 AND list_type = $2";
    const params = [sessionId, listType];
    let paramIdx = 3;

    if (search) {
      query += ` AND username ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY timestamp DESC NULLS LAST LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const { rows } = await this.pool.query(query, params);
    return rows || [];
  }

  async getRelationshipProfileCounts(sessionId) {
    const { rows } = await this.pool.query(
      "SELECT list_type, COUNT(*) as count FROM relationship_profiles WHERE session_id = $1 GROUP BY list_type",
      [sessionId]
    );
    const counts = {};
    (rows || []).forEach((r) => { counts[r.list_type] = parseInt(r.count); });
    return counts;
  }

  async getRelationshipProfileCount(sessionId, listType, search = null) {
    let query = "SELECT COUNT(*) as count FROM relationship_profiles WHERE session_id = $1 AND list_type = $2";
    const params = [sessionId, listType];
    let paramIdx = 3;
    if (search) {
      query += ` AND username ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
    }
    const { rows } = await this.pool.query(query, params);
    return rows[0] ? parseInt(rows[0].count) : 0;
  }

  async cleanup(olderThanDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const iso = cutoffDate.toISOString();

    await this.pool.query(
      "DELETE FROM users WHERE session_id IN (SELECT id FROM analysis_sessions WHERE created_at < $1)",
      [iso]
    );
    await this.pool.query(
      "DELETE FROM analysis_sessions WHERE created_at < $1",
      [iso]
    );
  }

  async getTimelineData(sessionId) {
    if (!sessionId) throw new Error("Session ID is required");

    const { rows } = await this.pool.query(
      `SELECT
         fe.event_timestamp,
         fe.followers_count,
         fe.following_count,
         fe.direction,
         fe.username,
         u.href
       FROM follower_events fe
       LEFT JOIN users u ON u.session_id = fe.session_id AND u.username = fe.username
       WHERE fe.session_id = $1
       ORDER BY fe.event_timestamp ASC`,
      [sessionId]
    );

    if (!rows || rows.length === 0) {
      return {
        followEvents: [],
        statistics: { totalFollowers: 0, totalFollowing: 0 },
      };
    }

    return {
      followEvents: rows.map((row) => ({
        timestamp: new Date(row.event_timestamp).toISOString(),
        username: row.username,
        direction: row.direction,
        followersCount: row.followers_count,
        followingCount: row.following_count,
        href: row.href,
      })),
      statistics: {
        totalFollowers: rows[rows.length - 1].followers_count,
        totalFollowing: rows[rows.length - 1].following_count,
      },
    };
  }

  async saveFollowerEvent(sessionId, timestamp, followersCount, followingCount, direction, username) {
    if (!sessionId || typeof sessionId !== "string") throw new Error("Valid session ID is required");
    if (!direction || !["follower", "following"].includes(direction)) throw new Error("Valid direction required");
    if (!username) throw new Error("Username is required");

    let eventTimestamp;
    try {
      if (typeof timestamp === "number") {
        eventTimestamp = new Date(timestamp * 1000).toISOString();
      } else if (timestamp instanceof Date) {
        eventTimestamp = timestamp.toISOString();
      } else if (typeof timestamp === "string") {
        const unix = parseInt(timestamp);
        eventTimestamp = !isNaN(unix)
          ? new Date(unix * 1000).toISOString()
          : new Date(timestamp).toISOString();
      } else {
        eventTimestamp = new Date().toISOString();
      }
    } catch {
      eventTimestamp = new Date().toISOString();
    }

    await this.pool.query(
      `INSERT INTO follower_events
       (session_id, event_timestamp, followers_count, following_count, direction, username)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [sessionId, eventTimestamp, Math.max(0, followersCount), Math.max(0, followingCount), direction, username]
    );
  }

  async savePendingRequests(sessionId, requests) {
    if (!requests || requests.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const request of requests) {
        let username = null, href = null, timestamp = null;

        if (request.string_list_data && request.string_list_data[0]) {
          const sld = request.string_list_data[0];
          username = sld.value;
          href = sld.href || null;
          timestamp = sld.timestamp || null;
        } else if (Array.isArray(request.label_values)) {
          const uEntry = request.label_values.find((lv) => lv.label === "Username");
          const urlEntry = request.label_values.find((lv) => lv.label === "URL");
          username = uEntry?.value || null;
          href = urlEntry?.value || null;
          timestamp = request.timestamp || null;
        } else {
          username = request.title || request.value || request.username || null;
          href = request.href || null;
          timestamp = request.timestamp || null;
        }

        if (username) {
          await client.query(
            `INSERT INTO pending_requests (session_id, username, profile_url, request_timestamp)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (session_id, username) DO UPDATE SET profile_url = $3, request_timestamp = $4`,
            [sessionId, username, href, timestamp]
          );
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getPendingRequests(sessionId) {
    const { rows } = await this.pool.query(
      `SELECT
         id, username, profile_url,
         CASE WHEN request_timestamp IS NOT NULL
           THEN to_timestamp(request_timestamp)::text
           ELSE NULL
         END as request_date,
         status, created_at
       FROM pending_requests
       WHERE session_id = $1
       ORDER BY request_timestamp DESC NULLS LAST`,
      [sessionId]
    );
    return rows;
  }

  async addUnfollowedProfile(sessionId, username, lastSeenCategory, profileUrl = null, timestamp = null, source = "detected") {
    const unfollowedAt = timestamp ? new Date(timestamp * 1000).toISOString() : null;
    await this.pool.query(
      `INSERT INTO unfollowed_profiles (username, last_seen_category, session_id, profile_url, unfollowed_at, source)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamp, NOW()), $6)`,
      [username, lastSeenCategory, sessionId, profileUrl, unfollowedAt, source]
    );
  }

  async getUnfollowedProfilesCount(sessionId, search = null) {
    let query = "SELECT COUNT(*) as count FROM unfollowed_profiles WHERE session_id = $1";
    const params = [sessionId];
    if (search) {
      query += " AND username ILIKE $2";
      params.push(`%${search}%`);
    }
    const { rows } = await this.pool.query(query, params);
    return rows[0] ? parseInt(rows[0].count) : 0;
  }

  async getAnalysisSessions(limit = 10) {
    const { rows } = await this.pool.query(
      "SELECT * FROM analysis_sessions ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return rows || [];
  }

  async queryRaw(sql, params = []) {
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }
}

const database = new Database();

async function initDatabase() {
  await database.connect();
  await database.createTables();
  return database;
}

module.exports = { database, initDatabase };
