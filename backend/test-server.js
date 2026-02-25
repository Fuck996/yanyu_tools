import 'dotenv/config'
import express from 'express'

const app = express()
const PORT = process.env.PORT || 3000

console.log('=== 环境变量检查 ===')
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? '✓ 已加载' : '✗ 未加载')
console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? '✓ 已加载' : '✗ 未加载')
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '（使用默认值）')
console.log('==================')

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

app.listen(PORT, () => {
  console.log(`✅ 简化测试服务器启动成功！`)
  console.log(`🚀 访问: http://localhost:${PORT}/api/health`)
})
