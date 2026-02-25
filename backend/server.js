import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { githubOAuthConfig, sessionConfig, corsConfig } from './config/oauth.js'
import { initDatabase } from './config/database.js'
import User from './models/user.js'
import authRoutes from './routes/auth.js'
import equipmentRoutes from './routes/equipment.js'

const app = express()
const PORT = process.env.PORT || 3000
const __dirname = dirname(fileURLToPath(import.meta.url))

// 中间件
app.use(express.json())
app.use(cors(corsConfig))
// 在生产环境下启用 trust proxy（必要时让 secure cookie 正确工作）
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}
app.use(session(sessionConfig))

// Passport 配置
passport.use(
  new GitHubStrategy(githubOAuthConfig, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOrCreate(profile.id, profile._json)
      return done(null, user)
    } catch (err) {
      return done(err)
    }
  })
)

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err))
})

app.use(passport.initialize())
app.use(passport.session())

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/equipment', equipmentRoutes)

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// 启动服务器
async function start() {
  try {
    await initDatabase()
    // 输出当前使用的回调与前端地址，便于排查 redirect_uri 问题
    console.log('🔧 GitHub callbackURL:', githubOAuthConfig.callbackURL)
    console.log('🔧 FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:5173')
    app.listen(PORT, () => {
      console.log(`
🚀 Server running at http://localhost:${PORT}
📝 GitHub OAuth configured
🗄️  Database initialized
`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
