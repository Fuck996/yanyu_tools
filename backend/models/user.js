import db from '../config/database.js'

export class User {
  static async findOrCreate(githubId, profile) {
    return new Promise((resolve, reject) => {
      // 先查找
      db.get(
        'SELECT * FROM users WHERE github_id = ?',
        [githubId],
        (err, row) => {
          if (err) {
            reject(err)
            return
          }

          if (row) {
            // 更新最后登录时间
            db.run(
              'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [row.id]
            )
            resolve(row)
            return
          }

          // 创建新用户
          db.run(
            `INSERT INTO users (github_id, username, email, avatar_url) 
             VALUES (?, ?, ?, ?)`,
            [
              githubId,
              profile.login || profile.username,
              profile.email,
              profile.avatar_url || profile.photos?.[0]?.value,
            ],
            function (err) {
              if (err) {
                reject(err)
                return
              }

              db.get(
                'SELECT * FROM users WHERE id = ?',
                [this.lastID],
                (err, newUser) => {
                  if (err) reject(err)
                  else resolve(newUser)
                }
              )
            }
          )
        }
      )
    })
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err)
          else resolve(row)
        }
      )
    })
  }

  static async findByGithubId(githubId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE github_id = ?',
        [githubId],
        (err, row) => {
          if (err) reject(err)
          else resolve(row)
        }
      )
    })
  }
}

export default User
