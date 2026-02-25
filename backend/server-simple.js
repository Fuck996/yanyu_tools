import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============ 版本号 ============
const BACKEND_VERSION = '4.8.2'
const BACKEND_BUILD_DATE = '2026-02-25'

// ============ 配置提取 ============
const PORT = process.env.PORT || 3000
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5500'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret'

console.log('📋 [启动日志] 环境变量检查:')
console.log(`   CLIENT_ID: ${GITHUB_CLIENT_ID ? '✓ 已设置' : '✗ 缺失'}`)
console.log(`   CLIENT_SECRET: ${GITHUB_CLIENT_SECRET ? '✓ 已设置' : '✗ 缺失'}`)
console.log(`   FRONTEND_URL: ${FRONTEND_URL}`)
console.log('')

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.error('❌ 错误: 缺少 GitHub OAuth 凭据！')
  console.error('   请检查 backend/.env 文件中是否有 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET')
  process.exit(1)
}

// ============ Express 应用 ============
const app = express()

// 中间件
app.use(express.json())
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}))

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    httpOnly: true, 
    secure: false, // 开发环境设为 false
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}))

app.use(passport.initialize())
app.use(passport.session())

// ============ Passport 配置 ============
passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: GITHUB_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  // 简化的用户对象
  const user = {
    id: profile.id,
    username: profile.username,
    email: profile.emails?.[0]?.value,
    avatar: profile.photos?.[0]?.value,
  }
  return done(null, user)
}))

passport.serializeUser((user, done) => {
  // 简化版：直接保存整个用户对象
  done(null, user)
})

passport.deserializeUser((user, done) => {
  // 简化版：直接返回用户对象
  done(null, user)
})

// ============ API 路由 ============
// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 版本检查
app.get('/api/version', (req, res) => {
  res.json({
    backend: BACKEND_VERSION,
    backend_build_date: BACKEND_BUILD_DATE,
    status: 'ok'
  })
})

// 登录路由
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }))

// 回调路由
app.get('/api/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    const user = req.user
    const token = Buffer.from(JSON.stringify(user)).toString('base64')
    // 确保重定向到 frontend/index.html
    const redirectUrl = FRONTEND_URL.endsWith('/frontend/index.html') 
      ? FRONTEND_URL 
      : `${FRONTEND_URL}/frontend/index.html`
    res.redirect(`${redirectUrl}?token=${token}&user=${encodeURIComponent(user.username)}`)
  }
)

// 获取当前用户
app.get('/api/auth/user', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  res.json(req.user)
})

// 退出登录
app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' })
    res.json({ message: 'Logged out' })
  })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 启动服务器
app.listen(PORT, () => {
  console.log('')
  console.log('╔════════════════════════════════════════╗')
  console.log('║     🚀 服务器启动成功！                │')
  console.log(`║  🌐 地址: http://localhost:${PORT}` + ' '.repeat(PORT.toString().length === 4 ? 19 : 18) + '│')
  console.log(`║  📝 GitHub OAuth: ✓ 已配置            │`)
  console.log('╚════════════════════════════════════════╝')
  console.log('')
})
