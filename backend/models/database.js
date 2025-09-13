const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "../data");
const DB_PATH = path.join(DATA_DIR, "analyzer.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log("📁 Connected to SQLite database");
          resolve();
        }
      });
    });
  }

  async getUnfollowedCount(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM unfollowed_profiles WHERE session_id = ?`,
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
  }

  async createTables() {
    const createAnalysisTable = `
      CREATE TABLE IF NOT EXISTS analysis_sessions (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        followers_count INTEGER,
        following_count INTEGER,
        mutual_count INTEGER,
        followers_only_count INTEGER,
        following_only_count INTEGER,
        processed_at DATETIME
      )
    `;

    const createUnfollowedTable = `
      CREATE TABLE IF NOT EXISTS unfollowed_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        unfollowed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_category TEXT,
        profile_url TEXT,
        source TEXT CHECK(source IN ('detected', 'imported')),
        session_id TEXT,
        FOREIGN KEY(session_id) REFERENCES analysis_sessions(id)
      )
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        username TEXT,
        category TEXT,
        href TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES analysis_sessions (id)
      )
    `;

    // Update the follower_events table schema
    const createFollowerEventsTable = `
      CREATE TABLE IF NOT EXISTS follower_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        event_timestamp DATETIME NOT NULL,
        followers_count INTEGER NOT NULL,
        following_count INTEGER NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('follower', 'following')),
        username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES analysis_sessions(id),
        UNIQUE(session_id, username, direction)
      )
    `;

    // Add indices for better performance
    const createPendingRequestsTable = `
      CREATE TABLE IF NOT EXISTS pending_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        username TEXT NOT NULL,
        profile_url TEXT NOT NULL,
        request_timestamp DATETIME NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES analysis_sessions(id),
        UNIQUE(session_id, username)
      )
    `;

    const createIndices = `
      CREATE INDEX IF NOT EXISTS idx_follower_events_session 
      ON follower_events(session_id, event_timestamp);
      CREATE INDEX IF NOT EXISTS idx_users_session_category 
      ON users(session_id, category);
      CREATE INDEX IF NOT EXISTS idx_pending_requests_session 
      ON pending_requests(session_id);
      CREATE INDEX IF NOT EXISTS idx_unfollowed_profiles_session 
      ON unfollowed_profiles(session_id, unfollowed_at);
      CREATE INDEX IF NOT EXISTS idx_users_username 
      ON users(username);
      CREATE INDEX IF NOT EXISTS idx_unfollowed_profiles_username 
      ON unfollowed_profiles(username);
      CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at 
      ON analysis_sessions(created_at);
      CREATE INDEX IF NOT EXISTS idx_follower_events_created_at 
      ON follower_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_unfollowed_profiles_created_at 
      ON unfollowed_profiles(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_session_username ON users(session_id, username);
      CREATE INDEX IF NOT EXISTS idx_follower_events_session_direction ON follower_events(session_id, direction);
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createAnalysisTable, (err) => {
          if (err) reject(err);
        });

        this.db.run(createUsersTable, (err) => {
          if (err) reject(err);
        });

        this.db.run(createFollowerEventsTable, (err) => {
          if (err) reject(err);
        });

        this.db.run(createPendingRequestsTable, (err) => {
          if (err) reject(err);
        });

        this.db.run(createUnfollowedTable, (err) => {
          if (err) reject(err);
        });

        this.db.run(createIndices, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Apply migrations for existing tables
          const migrations = [
            `ALTER TABLE unfollowed_profiles ADD COLUMN source TEXT CHECK(source IN ('detected', 'imported')) DEFAULT 'detected'`,
            `ALTER TABLE unfollowed_profiles ADD COLUMN profile_url TEXT`,
            `ALTER TABLE unfollowed_profiles ADD COLUMN session_id TEXT REFERENCES analysis_sessions(id)`,
          ];

          const runMigrations = () => {
            if (migrations.length === 0) {
              resolve();
              return;
            }

            const migration = migrations.shift();
            this.db.run(migration, (err) => {
              if (err) {
                // Ignore column already exists error
                if (!err.message.includes("duplicate column")) {
                  console.error("Migration error:", err);
                }
              }
              runMigrations();
            });
          };

          runMigrations();
        });
      });
    });
  }

  async getUnfollowedCount(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM unfollowed_profiles WHERE session_id = ?`,
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
  }

  async getUnfollowedProfiles(
    sessionId,
    limit = 20,
    offset = 0,
    search = null
  ) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          up.id,
          up.username,
          up.unfollowed_at,
          up.last_seen_category,
          COALESCE(up.profile_url, u.href) as profile_url,
          up.source,
          datetime(up.unfollowed_at) as unfollowed_date
        FROM unfollowed_profiles up
        LEFT JOIN users u ON u.username = up.username AND u.session_id = up.session_id
        WHERE up.session_id = ?`;

      let params = [sessionId];

      if (search) {
        query += " AND up.username LIKE ?";
        params.push(`%${search}%`);
      }

      query += " ORDER BY up.unfollowed_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error("Database query error:", err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async saveAnalysis(sessionId, analysisData) {
    const { followers, following, mutual, followersOnly, followingOnly } =
      analysisData;

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO analysis_sessions 
        (id, followers_count, following_count, mutual_count, followers_only_count, following_only_count, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        [
          sessionId,
          followers.length,
          following.length,
          mutual.length,
          followersOnly.length,
          followingOnly.length,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );

      stmt.finalize();
    });
  }

  async saveUsers(sessionId, users, category) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO users (session_id, username, category, href)
        VALUES (?, ?, ?, ?)
      `);

      users.forEach((user) => {
        stmt.run([sessionId, user.value || user.username, category, user.href]);
      });

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async saveBatchUsers(sessionId, users, category) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");

        const stmt = this.db.prepare(`
          INSERT INTO users (session_id, username, category, href)
          VALUES (?, ?, ?, ?)
        `);

        users.forEach((user) => {
          stmt.run([
            sessionId,
            user.value || user.username,
            category,
            user.href,
          ]);
        });

        stmt.finalize();
        this.db.run("COMMIT", (err) => {
          if (err) {
            this.db.run("ROLLBACK");
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async saveBatchFollowerEvents(sessionId, events) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");

        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO follower_events 
          (session_id, event_timestamp, followers_count, following_count, direction, username)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        events.forEach((event) => {
          let eventTimestamp;
          try {
            if (typeof event.timestamp === "number") {
              eventTimestamp = new Date(event.timestamp * 1000).toISOString();
            } else if (event.timestamp instanceof Date) {
              eventTimestamp = event.timestamp.toISOString();
            } else if (typeof event.timestamp === "string") {
              const unixTimestamp = parseInt(event.timestamp);
              if (!isNaN(unixTimestamp)) {
                eventTimestamp = new Date(unixTimestamp * 1000).toISOString();
              } else {
                eventTimestamp = new Date(event.timestamp).toISOString();
              }
            } else {
              eventTimestamp = new Date().toISOString();
            }
          } catch (error) {
            eventTimestamp = new Date().toISOString();
          }

          stmt.run([
            sessionId,
            eventTimestamp,
            Math.max(0, event.followersCount || 0),
            Math.max(0, event.followingCount || 0),
            event.direction,
            event.username,
          ]);
        });

        stmt.finalize();
        this.db.run("COMMIT", (err) => {
          if (err) {
            this.db.run("ROLLBACK");
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async getAnalysis(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM analysis_sessions WHERE id = ?",
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUsers(sessionId, category = null, search = null) {
    let query = "SELECT * FROM users WHERE session_id = ?";
    let params = [sessionId];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (search) {
      query += " AND username LIKE ?";
      params.push(`%${search}%`);
    }

    query += " ORDER BY username";

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async cleanup(olderThanDays = 7) {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      this.db.serialize(() => {
        this.db.run(
          "DELETE FROM users WHERE session_id IN (SELECT id FROM analysis_sessions WHERE created_at < ?)",
          [cutoffDate.toISOString()],
          (err) => {
            if (err) reject(err);
          }
        );

        this.db.run(
          "DELETE FROM analysis_sessions WHERE created_at < ?",
          [cutoffDate.toISOString()],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }

  async getTimelineData(sessionId) {
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          fe.event_timestamp,
          fe.followers_count,
          fe.following_count,
          fe.direction,
          fe.username,
          u.href
        FROM follower_events fe
        LEFT JOIN users u 
          ON u.session_id = fe.session_id 
          AND u.username = fe.username
        WHERE fe.session_id = ?
        ORDER BY fe.event_timestamp ASC
      `;

      this.db.all(query, [sessionId], (err, rows) => {
        if (err) {
          console.error("Error fetching timeline data:", err);
          reject(err);
          return;
        }

        if (!rows || rows.length === 0) {
          resolve({
            followEvents: [],
            statistics: {
              totalFollowers: 0,
              totalFollowing: 0,
            },
          });
          return;
        }

        const timelineData = {
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

        resolve(timelineData);
      });
    });
  }

  /**
   * Save a follower event to the database
   * @param {string} sessionId - The analysis session ID
   * @param {Date} timestamp - When the follow/unfollow event occurred
   * @param {number} followersCount - Number of followers at this point
   * @param {number} followingCount - Number of following at this point
   * @param {string} direction - The direction of the event ('follower' or 'following')
   * @returns {Promise<void>}
   */
  async saveFollowerEvent(
    sessionId,
    timestamp,
    followersCount,
    followingCount,
    direction,
    username
  ) {
    // Validate all required parameters
    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("Valid session ID is required");
    }
    if (!direction || !["follower", "following"].includes(direction)) {
      throw new Error("Valid direction (follower/following) is required");
    }
    if (!username) {
      throw new Error("Username is required");
    }

    // Convert Instagram's Unix timestamp (seconds) to JavaScript timestamp (milliseconds)
    let eventTimestamp;
    try {
      if (typeof timestamp === "number") {
        // Instagram timestamp is in seconds
        eventTimestamp = new Date(timestamp * 1000).toISOString();
      } else if (timestamp instanceof Date) {
        eventTimestamp = timestamp.toISOString();
      } else if (typeof timestamp === "string") {
        // Try parsing as Unix timestamp first
        const unixTimestamp = parseInt(timestamp);
        if (!isNaN(unixTimestamp)) {
          eventTimestamp = new Date(unixTimestamp * 1000).toISOString();
        } else {
          // Try parsing as ISO string
          eventTimestamp = new Date(timestamp).toISOString();
        }
      } else {
        throw new Error("Invalid timestamp format");
      }
    } catch (error) {
      console.error("Invalid timestamp:", error);
      eventTimestamp = new Date().toISOString();
    }

    // Check if an event already exists for this user at this timestamp
    const checkQuery = `
      SELECT id FROM follower_events 
      WHERE session_id = ? AND event_timestamp = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.get(checkQuery, [sessionId, eventTimestamp], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        // If event already exists, skip insertion
        if (row) {
          resolve();
          return;
        }

        // Insert new event
        const insertQuery = `
          INSERT INTO follower_events (
            session_id,
            event_timestamp,
            followers_count,
            following_count,
            direction,
            username
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        this.db.run(
          insertQuery,
          [
            sessionId,
            eventTimestamp,
            Math.max(0, followersCount),
            Math.max(0, followingCount),
            direction,
            username,
          ],
          (err) => {
            if (err) {
              console.error("Error saving follower event:", err);
              reject(new Error("Failed to save follower event"));
            } else {
              resolve();
            }
          }
        );
      });
    });
  }

  async savePendingRequests(sessionId, requests) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO pending_requests 
        (session_id, username, profile_url, request_timestamp)
        VALUES (?, ?, ?, ?)
      `);

      requests.forEach((request) => {
        const userData = request.string_list_data[0];
        stmt.run([
          sessionId,
          userData.value,
          userData.href,
          userData.timestamp,
        ]);
      });

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getPendingRequests(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          id,
          username,
          profile_url,
          datetime(request_timestamp, 'unixepoch') as request_date,
          status,
          created_at
        FROM pending_requests 
        WHERE session_id = ? 
        ORDER BY request_timestamp DESC`,
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async addUnfollowedProfile(
    sessionId,
    username,
    lastSeenCategory,
    profileUrl = null,
    timestamp = null,
    source = "detected"
  ) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO unfollowed_profiles (
          username, 
          last_seen_category, 
          session_id, 
          profile_url,
          unfollowed_at,
          source
        )
        VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)
      `);

      const unfollowedAt = timestamp
        ? new Date(timestamp * 1000).toISOString()
        : null;

      stmt.run(
        [
          username,
          lastSeenCategory,
          sessionId,
          profileUrl,
          unfollowedAt,
          source,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );

      stmt.finalize();
    });
  }

  async getUnfollowedProfilesCount(sessionId, search = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT COUNT(*) as count
        FROM unfollowed_profiles
        WHERE session_id = ?
      `;

      let params = [sessionId];

      if (search) {
        query += " AND username LIKE ?";
        params.push(`%${search}%`);
      }

      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
  }

  async getAnalysisSessions(limit = 10) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT *
        FROM analysis_sessions
        ORDER BY created_at DESC
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

const database = new Database();

async function initDatabase() {
  await database.connect();
  await database.createTables();
  return database;
}

module.exports = { database, initDatabase };
