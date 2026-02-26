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
        console.error('Failed to insert equipment_record:', err)
        return res.status(500).json({ error: 'Failed to save record', detail: err.message })
      }
      console.log('Record saved:', { id: recordId, userId })
      res.json({ id: recordId, message: 'Record saved successfully' })
    }
  )
})

// 获取用户的统计信息（记录数、最后同步时间等）
router.get('/stats', requireAuth, (req, res) => {
  const userId = req.user.id

  db.get(
    'SELECT COUNT(*) as count FROM equipment_records WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch stats' })
      }

      const recordCount = row?.count || 0

      res.json({
        success: true,
        recordCount,
        timestamp: new Date().toISOString(),
      })
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

// 批量导入装备数据（前端同步时调用）
// 使用 Promise 包装 db 操作以支持 async/await
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err)
      else resolve(this)
    })
  })
}

router.post('/import', requireAuth, async (req, res) => {
  const userId = req.user.id
  const { data } = req.body

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data format' })
  }

  console.log('POST /api/equipment/import called. user:', { id: userId }, 'data keys:', Object.keys(data))

  try {
    // 清空用户现有记录
    await dbRun('DELETE FROM equipment_records WHERE user_id = ?', [userId])
    console.log('✅ Cleared existing records for user:', userId)

    // 递归解析前端的嵌套数据结构：
    // { equipmentType: { location: { equipmentName: [records] } } }
    let insertCount = 0
    const parseAndInsert = async (obj, equipmentType = null, location = null) => {
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          // 这是一个记录数组
          // 前端格式：{ q: quality, attrs: attributes, special: special_attr, k: isFavorite }
          for (const record of value) {
            if (record && typeof record === 'object') {
              const recordId = record.id || uuidv4()
              const type = record.equipmentType || equipmentType || 'unknown'
              const loc = record.location || location || 'unknown'
              const name = record.equipmentName || key
              // 关键修复：使用前端的字段名（q, attrs, special, k）而不是数据库字段名
              const quality = record.q || record.quality || 'normal'
              const specialAttr = record.special || record.specialAttr || ''
              const attributes = record.attrs || record.attributes || {}
              const isFavorite = record.k || record.isFavorite ? 1 : 0

              try {
                await dbRun(
                  `INSERT INTO equipment_records 
                   (id, user_id, equipment_type, location, equipment_name, quality, attributes, special_attr, is_favorite)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [recordId, userId, type, loc, name, quality, JSON.stringify(attributes), specialAttr, isFavorite]
                )
                insertCount++
              } catch (insertErr) {
                console.error('Failed to insert record:', { recordId, name, error: insertErr.message })
              }
            }
          }
        } else if (value && typeof value === 'object') {
          // 递归处理嵌套对象
          // 传递当前 key 作为 equipmentType 或 location
          await parseAndInsert(value, equipmentType || key, location || (equipmentType ? key : null))
        }
      }
    }

    await parseAndInsert(data)

    console.log(`✅ Import completed: ${insertCount} records inserted`)

    // 返回实际插入的记录数
    res.json({
      success: true,
      message: 'Data import completed',
      insertedRecords: insertCount,
    })
  } catch (err) {
    console.error('Import error:', err)
    res.status(500).json({ error: 'Import failed', detail: err.message })
  }
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

// 保存手动备份到服务器
router.post('/save-backup', requireAuth, async (req, res) => {
  const userId = req.user.id
  const { backupType } = req.body
  const type = backupType || 'manual'  // 默认为手动备份
  
  try {
    // 删除用户对应类型的旧备份（只保留最新一份）
    // 无论是手动还是自动备份都只保留一份
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM export_history WHERE user_id = ? AND backup_type = ?',
        [userId, type],
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
    console.log(`✅ Deleted old ${type} backup for user: ${userId}`)

    // 获取用户当前的所有数据
    const records = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM equipment_records WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows || [])
        }
      )
    })

    const backupData = records.map(row => ({
      ...row,
      attributes: JSON.parse(row.attributes || '{}'),
    }))

    const backupId = uuidv4()
    const timestamp = new Date().toISOString()

    // 保存到 export_history 表
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO export_history (id, user_id, backup_type, export_data, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [backupId, userId, type, JSON.stringify(backupData), timestamp],
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })

    res.json({
      success: true,
      backupId,
      backupType: type,
      timestamp,
      recordCount: records.length,
    })
  } catch (err) {
    console.error('Save backup error:', err)
    res.status(500).json({ error: 'Failed to save backup', detail: err.message })
  }
})

// 获取用户的所有备份列表
router.get('/backups', requireAuth, (req, res) => {
  const userId = req.user.id
  console.log(`📝 GET /backups called for user ${userId}`)

  db.all(
    `SELECT id, backup_type, export_data, created_at FROM export_history 
     WHERE user_id = ? 
     ORDER BY backup_type ASC, created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('❌ 获取备份列表失败:', err.message, err.code)
        console.error('SQL Error Details:', err)
        return res.status(500).json({ error: 'Failed to fetch backups', detail: err.message })
      }
      
      console.log(`✅ Query succeeded`)
      const backupRows = rows || []
      console.log(`📊 Found ${backupRows.length} total backups for user ${userId}`)

      // 先按备份类型分组，然后返回
      const manualBackups = []
      const autoBackups = []
      
      backupRows.forEach((row, idx) => {
        try {
          // 防守性检查：确保row有所有必要的字段
          if (!row) {
            console.warn(`  ⚠️ Backup ${idx + 1} is null/undefined, skipping`)
            return
          }
          
          if (!row.id || !row.backup_type) {
            console.warn(`  ⚠️ Backup ${idx + 1} missing id or backup_type:`, { id: row.id, backup_type: row.backup_type })
            return
          }
          
          console.log(`📋 Processing backup ${idx + 1}:`, { id: row.id, type: row.backup_type })
          
          let recordCount = 0
          try {
            const data = JSON.parse(row.export_data || '[]')
            // 处理两种格式：单个对象或数组
            recordCount = Array.isArray(data) ? data.length : 0
            console.log(`  📊 recordCount: ${recordCount}`)
          } catch (parseErr) {
            console.warn(`  ⚠️ 无法解析备份数据 ${row.id}: ${parseErr.message}`)
            recordCount = 0
          }

          const backup = {
            id: String(row.id || ''),
            backupType: String(row.backup_type || 'unknown'),
            timestamp: String(row.created_at || new Date().toISOString()),
            recordCount: Number(recordCount) || 0,
          }
          
          console.log(`  ✅ Built backup object:`, backup)

          if (row.backup_type === 'manual') {
            // 手动备份只保留第一条（最新）
            if (manualBackups.length === 0) {
              manualBackups.push(backup)
              console.log(`  ✅ Added manual backup`)
            }
          } else {
            // 自动备份也只保留第一条（最新）
            if (autoBackups.length === 0) {
              autoBackups.push(backup)
              console.log(`  ✅ Added auto backup`)
            }
          }
        } catch (e) {
          console.error(`  ❌ 处理备份 ${row.id} 失败:`, e.message)
        }
      })

      // 合并结果：手动备份在前
      const response = [...manualBackups, ...autoBackups]
      
      try {
        console.log(`✅ 用户 ${userId} 备份列表: ${manualBackups.length} 个手动备份, ${autoBackups.length} 个自动备份`)
        console.log(`📤 Response payload ready to send: ${response.length} backups`)
        res.json({ success: true, backups: response })
      } catch (respErr) {
        console.error(`❌ 发送响应失败:`, respErr.message)
        res.status(500).json({ error: 'Failed to send response', detail: respErr.message })
      }
    }
  )
})

// 恢复指定备份
router.post('/restore-backup/:backupId', requireAuth, async (req, res) => {
  const userId = req.user.id
  const { backupId } = req.params

  try {
    // 获取备份数据
    const backup = await new Promise((resolve, reject) => {
      db.get(
        'SELECT export_data FROM export_history WHERE id = ? AND user_id = ?',
        [backupId, userId],
        (err, row) => {
          if (err) reject(err)
          else resolve(row)
        }
      )
    })

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' })
    }

    const backupRecords = JSON.parse(backup.export_data)

    // 清空现有数据并恢复备份
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM equipment_records WHERE user_id = ?', [userId], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    // 插入备份数据
    let restoredCount = 0
    for (const record of backupRecords) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO equipment_records 
           (id, user_id, equipment_type, location, equipment_name, quality, attributes, special_attr, is_favorite)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            userId,
            record.equipment_type,
            record.location,
            record.equipment_name,
            record.quality,
            JSON.stringify(record.attributes || {}),
            record.special_attr || '',
            record.is_favorite ? 1 : 0,
          ],
          (err) => {
            if (err) reject(err)
            else {
              restoredCount++
              resolve()
            }
          }
        )
      })
    }

    res.json({
      success: true,
      message: 'Backup restored successfully',
      restoredRecords: restoredCount,
    })
  } catch (err) {
    console.error('Restore backup error:', err)
    res.status(500).json({ error: 'Failed to restore backup', detail: err.message })
  }
})

// 清空用户的所有装备数据
router.post('/clear-data', requireAuth, async (req, res) => {
  const userId = req.user.id

  try {
    // 删除用户的所有装备记录
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM equipment_records WHERE user_id = ?', [userId], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    // 同步删除 auto 自动备份（manual 手动备份由用户管理，保留不动）
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM export_history WHERE user_id = ? AND backup_type = ?', [userId, 'auto'], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    console.log(`✅ Cleared all equipment data and auto backup for user: ${userId}`)
    res.json({
      success: true,
      message: 'All equipment data cleared successfully',
    })
  } catch (err) {
    console.error('Clear data error:', err)
    res.status(500).json({ error: 'Failed to clear data', detail: err.message })
  }
})

export default router
