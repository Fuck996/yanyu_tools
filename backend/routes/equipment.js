import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../config/database.js'

const router = express.Router()

// 中间件：检查认证
const requireAuth = (req, res, next) => {
  // 优先使用 session（Passport）提供的 req.user
  if (!req.user) {
    // 尝试从 Authorization: Bearer <token> 恢复用户（兼容前端仅保存 token 的场景）
    try {
      const auth = req.headers.authorization || ''
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7)
        try {
          const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
          // 简单恢复 req.user（注意：此 token 未签名，仅用于兼容性）
          req.user = decoded
        } catch (e) {
          // 无法解析 token，继续走后续检查
        }
      }
    } catch (e) {
      // ignore
    }

    if (!req.user) {
      // 调试信息：当认证失败时打印 cookie，便于定位移动端/跨站 cookie 问题
      try {
        console.warn('Authentication failed. request cookies:', req.headers.cookie)
      } catch (e) {
        console.warn('Authentication failed. (no cookie header)')
      }
      return res.status(401).json({ error: 'Not authenticated' })
    }
  }
  next()
}

// 保存装备记录
router.post('/records', requireAuth, (req, res) => {
  console.log('POST /api/equipment/records called. user:', req.user ? { id: req.user.id, username: req.user.username } : null)
  console.log('Request headers:', { cookie: req.headers.cookie, authorization: req.headers.authorization })
  console.log('Request body preview:', JSON.stringify(req.body).slice(0, 1000))
  const { equipmentType, location, equipmentName, quality, attributes, specialAttr } = req.body
  const recordId = uuidv4()
  const userId = req.user.id

  db.run(
    `INSERT INTO equipment_records 
     (id, user_id, equipment_type, location, equipment_name, quality, attributes, special_attr)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [recordId, userId, equipmentType, location, equipmentName, quality, JSON.stringify(attributes), specialAttr],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save record' })
      }
      res.json({ id: recordId, message: 'Record saved successfully' })
    }
  )
})

// 获取用户的所有装备记录
router.get('/records', requireAuth, (req, res) => {
  console.log('GET /api/equipment/records called. user:', req.user ? { id: req.user.id, username: req.user.username } : null)
  console.log('Request headers:', { cookie: req.headers.cookie, authorization: req.headers.authorization })
  const userId = req.user.id

  db.all(
    'SELECT * FROM equipment_records WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch records' })
      }
      const records = rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes),
      }))
      res.json(records)
    }
  )
})

// 更新装备记录
router.put('/records/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const { quality, attributes, specialAttr, isFavorite } = req.body
  const userId = req.user.id

  db.run(
    `UPDATE equipment_records 
     SET quality = ?, attributes = ?, special_attr = ?, is_favorite = ?
     WHERE id = ? AND user_id = ?`,
    [quality, JSON.stringify(attributes), specialAttr, isFavorite ? 1 : 0, id, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update record' })
      }
      res.json({ message: 'Record updated successfully' })
    }
  )
})

// 删除装备记录
router.delete('/records/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  db.run(
    'DELETE FROM equipment_records WHERE id = ? AND user_id = ?',
    [id, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete record' })
      }
      res.json({ message: 'Record deleted successfully' })
    }
  )
})

// 导出用户数据
router.get('/export', requireAuth, (req, res) => {
  const userId = req.user.id

  db.all(
    'SELECT * FROM equipment_records WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to export data' })
      }
      const records = rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes),
      }))
      res.json(records)
    }
  )
})

export default router
