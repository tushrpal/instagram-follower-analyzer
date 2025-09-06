const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/analyzer.db");

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
    const createIndices = `
      CREATE INDEX IF NOT EXISTS idx_follower_events_session 
      ON follower_events(session_id, event_timestamp);
      CREATE INDEX IF NOT EXISTS idx_users_session_category 
      ON users(session_id, category);
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

        this.db.run(createIndices, (err) => {
          if (err) reject(err);
          else resolve();
        });
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
}

const database = new Database();

async function initDatabase() {
  await database.connect();
  await database.createTables();
  return database;
}

module.exports = { database, initDatabase };
