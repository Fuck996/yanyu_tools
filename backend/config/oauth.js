import 'dotenv/config'

export const githubOAuthConfig = {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:
    process.env.GITHUB_CALLBACK_URL || `http://localhost:${process.env.PORT || 3000}/api/auth/github/callback`,
  scope: ['user:email', 'read:user'],
}

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev_secret_key_change_in_production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 生产环境下需要允许跨站点 cookie（SameSite=None）并启用 Secure
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}

export const corsConfig = {
  // 支持可配置的多个允许来源（逗号分隔），并在运行时根据请求 Origin 动态允许
  origin: (origin, callback) => {
    const configured = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173'
    const allowed = configured.split(',').map(s => s.trim()).filter(Boolean)

    // 如果没有 origin（例如 server-to-server 请求），允许通过
    if (!origin) return callback(null, true)

    // 允许精确匹配或允许本地开发常见别名
    if (allowed.includes(origin)) return callback(null, true)

    // 兼容 127.0.0.1:5500 开发场景
    const devAliases = ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5173']
    if (devAliases.includes(origin)) return callback(null, true)

    // 否则静默拒绝（不加 CORS 头），避免 callback(Error) 触发 Express 500
    console.warn(`[CORS] 拒绝来源: ${origin}，当前允许列表: ${allowed.join(', ')}`)
    return callback(null, false)
  },
  credentials: true,
}
