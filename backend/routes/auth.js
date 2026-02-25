import express from 'express'
import passport from 'passport'

const router = express.Router()

// GitHub 登录入口
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }))

// GitHub OAuth 回调
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/login?error=true' }),
  (req, res) => {
    // 认证成功，生成 token
    const user = req.user
    const token = Buffer.from(JSON.stringify(user)).toString('base64')

    // 重定向回前端并带上 token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}?token=${token}&user=${user.username}`)
  }
)

// 获取当前用户信息
router.get('/user', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  res.json(req.user)
})

// 退出登录
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' })
    }
    res.json({ message: 'Logged out successfully' })
  })
})

// 验证 token
router.post('/verify-token', (req, res) => {
  const token = req.body.token
  if (!token) {
    return res.status(400).json({ error: 'No token provided' })
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    res.json({ valid: true, user: decoded })
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid token' })
  }
})

export default router
