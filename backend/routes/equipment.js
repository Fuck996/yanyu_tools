import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../config/database.js'

const router = express.Router()

// 中间件：检查认证
const requireAuth = (req, res, next) => {
  if (!req.user) {
    // 调试信息：当认证失败时打印 cookie，便于定位移动端/跨站 cookie 问题
    try {
      console.warn('Authentication failed. request cookies:', req.headers.cookie)
    } catch (e) {
      console.warn('Authentication failed. (no cookie header)')
    }
    return res.status(401).json({ error: 'Not authenticated' })
  }
  next()
}

// 保存装备记录
router.post('/records', requireAuth, (req, res) => {
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
