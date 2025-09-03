const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/analyzer.db');

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
          console.log('📁 Connected to SQLite database');
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

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createAnalysisTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createUsersTable, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async saveAnalysis(sessionId, analysisData) {
    const { followers, following, mutual, followersOnly, followingOnly } = analysisData;
    
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO analysis_sessions 
        (id, followers_count, following_count, mutual_count, followers_only_count, following_only_count, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run([
        sessionId,
        followers.length,
        following.length,
        mutual.length,
        followersOnly.length,
        followingOnly.length
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
      
      stmt.finalize();
    });
  }

  async saveUsers(sessionId, users, category) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO users (session_id, username, category, href)
        VALUES (?, ?, ?, ?)
      `);
      
      users.forEach(user => {
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
        'SELECT * FROM analysis_sessions WHERE id = ?',
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUsers(sessionId, category = null, search = null) {
    let query = 'SELECT * FROM users WHERE session_id = ?';
    let params = [sessionId];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND username LIKE ?';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY username';
    
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
          'DELETE FROM users WHERE session_id IN (SELECT id FROM analysis_sessions WHERE created_at < ?)',
          [cutoffDate.toISOString()],
          (err) => {
            if (err) reject(err);
          }
        );
        
        this.db.run(
          'DELETE FROM analysis_sessions WHERE created_at < ?',
          [cutoffDate.toISOString()],
          (err) => {
            if (err) reject(err);
            else resolve();
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