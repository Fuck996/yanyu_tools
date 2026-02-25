import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')
const dbPath = process.env.DB_PATH || join(dataDir, 'yanyu_tools.db')

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err)
  else console.log('Connected to SQLite database at:', dbPath)
})

export async function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          github_id TEXT UNIQUE NOT NULL,
          username TEXT NOT NULL,
          email TEXT,
          avatar_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // 装备数据表
      db.run(`
        CREATE TABLE IF NOT EXISTS equipment_records (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          equipment_type TEXT NOT NULL,
          location TEXT NOT NULL,
          equipment_name TEXT NOT NULL,
          quality TEXT NOT NULL,
          attributes TEXT NOT NULL,
          special_attr TEXT,
          is_favorite INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)

      // 导出历史表（用于备份）
      db.run(`
        CREATE TABLE IF NOT EXISTS export_history (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          backup_type TEXT DEFAULT 'auto',
          export_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      
      // 迁移：为已存在的export_history表添加backup_type列（如果不存在）
      db.run(
        `ALTER TABLE export_history ADD COLUMN backup_type TEXT DEFAULT 'auto'`,
        (err) => {
          // 忽略列已存在的错误
          if (err && !err.message.includes('duplicate column')) {
            console.warn('⚠️ ALTER TABLE warning (expected if column already exists):', err.message)
          } else if (!err) {
            console.log('✅ Successfully added backup_type column to export_history')
          }
          resolve()
        }
      )
    })
  })
}

export default db
