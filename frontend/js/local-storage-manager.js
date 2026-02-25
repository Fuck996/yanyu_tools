/**
 * 本地存储管理器
 * 处理所有 localStorage 相关的操作
 * 支持数据的读写、备份、恢复
 */

const STORAGE_KEY = 'yanyu_v24_db'
const SYNC_STATUS_KEY = 'yanyu_sync_status'
const USER_KEY = 'yanyu_user_info'
const EQUIPMENT_TIMESTAMP_KEY = 'yanyu_v24_equipment_timestamp'
const CONFLICT_CHECK_KEY = 'yanyu_has_checked_conflict'  // 会话标志：是否已检测过冲突
const MANUAL_BACKUP_KEY = 'yanyu_manual_sync_backup'  // 手动备份数据
const MANUAL_BACKUP_TIMESTAMP_KEY = 'yanyu_manual_sync_timestamp'  // 手动备份时间戳

export const LocalStorageManager = {
  /**
   * 保存装备数据
   * @param {Object} data - 装备数据对象
   */
  saveEquipmentData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      this.updateEquipmentDataTimestamp()  // 更新时间戳
      this.updateSyncStatus('saved')
      return { success: true }
    } catch (err) {
      console.error('保存数据失败:', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * 读取装备数据
   * @returns {Object} 装备数据
   */
  getEquipmentData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (err) {
      console.error('读取数据失败:', err)
      return {}
    }
  },

  /**
   * 清空装备数据
   */
  clearEquipmentData() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      this.updateSyncStatus('cleared')
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * 导出数据为 JSON 对象
   * @returns {Object} 包含元数据的导出数据
   */
  exportData() {
    const user = this.getUserInfo()
    return {
      version: '4.8.0',
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, username: user.username } : null,
      data: this.getEquipmentData(),
    }
  },

  /**
   * 从 JSON 导入数据
   * @param {Object} importData - 导入的数据对象
   * @returns {Object} 操作结果
   */
  importData(importData) {
    try {
      if (importData.data) {
        this.saveEquipmentData(importData.data)
        return { success: true, message: '数据导入成功' }
      }
      return { success: false, error: '无效的导入格式' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * 保存用户信息
   * @param {Object} userInfo - 用户信息 { id, username, email, avatar_url, github_id }
   */
  saveUserInfo(userInfo) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
      this.updateSyncStatus('user_logged_in')
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * 获取用户信息
   * @returns {Object|null} 用户信息，未登录时为 null
   */
  getUserInfo() {
    try {
      const user = localStorage.getItem(USER_KEY)
      return user ? JSON.parse(user) : null
    } catch (err) {
      return null
    }
  },

  /**
   * 清除用户信息（退出登录）
   */
  clearUserInfo() {
    try {
      localStorage.removeItem(USER_KEY)
      this.updateSyncStatus('user_logged_out')
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * 获取同步状态
   * @returns {Object} 同步状态信息
   */
  getSyncStatus() {
    try {
      const status = localStorage.getItem(SYNC_STATUS_KEY)
      return status ? JSON.parse(status) : { state: 'idle' }
    } catch (err) {
      return { state: 'idle' }
    }
  },

  /**
   * 更新同步状态
   * @param {string} state - 状态 ('idle', 'syncing', 'saved', 'error', etc.)
   * @param {Object} extra - 额外信息
   */
  updateSyncStatus(state, extra = {}) {
    try {
      const status = {
        state,
        timestamp: new Date().toISOString(),
        ...extra,
      }
      localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status))
    } catch (err) {
      console.error('更新同步状态失败:', err)
    }
  },

  /**
   * 检查是否有存储空间警告
   * @returns {boolean} 是否接近存储限制
   */
  checkStorageWarning() {
    try {
      const test = 'storage_test_' + Date.now()
      localStorage.setItem(test, test)
      localStorage.removeItem(test)

      // 一个粗略的估计：localStorage 通常是 5MB
      const data = this.getEquipmentData()
      const size = new Blob([JSON.stringify(data)]).size
      return size > 4 * 1024 * 1024 // 警告阈值：4MB
    } catch (err) {
      return true // 存储故障视为警告
    }
  },

  /**
   * 获取数据占用的存储大小（估算）
   * @returns {string} 人类可读的大小字符串
   */
  getStorageUsage() {
    const data = this.getEquipmentData()
    const size = new Blob([JSON.stringify(data)]).size

    if (size < 1024) return size + ' B'
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
    return (size / (1024 * 1024)).toFixed(2) + ' MB'
  },

  /**
   * 迁移旧版本数据
   * @param {string} oldKey - 旧数据的 key
   */
  migrateOldData(oldKey = 'yanyu_equipment_db') {
    try {
      const oldData = localStorage.getItem(oldKey)
      if (oldData && !localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, oldData)
        console.log('✅ 旧版本数据已迁移')
        return { success: true, message: '数据迁移成功' }
      }
      return { success: true, message: '无需迁移' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * 获取装备数据的最后修改时间
   * @returns {Date|null} 最后修改时间
   */
  getEquipmentDataTimestamp() {
    try {
      const timestamp = localStorage.getItem(EQUIPMENT_TIMESTAMP_KEY)
      return timestamp ? new Date(timestamp) : null
    } catch (err) {
      return null
    }
  },

  /**
   * 更新装备数据的最后修改时间
   * @returns {string} ISO格式的时间戳
   */
  updateEquipmentDataTimestamp() {
    try {
      const now = new Date().toISOString()
      localStorage.setItem(EQUIPMENT_TIMESTAMP_KEY, now)
      return now
    } catch (err) {
      console.error('更新时间戳失败:', err)
      return null
    }
  },

  /**
   * 保存手动备份（新备份会覆盖旧备份）
   * @returns {Object} 操作结果
   */
  saveManualBackup() {
    try {
      const data = this.getEquipmentData()
      const timestamp = new Date().toISOString()
      localStorage.setItem(MANUAL_BACKUP_KEY, JSON.stringify(data))
      localStorage.setItem(MANUAL_BACKUP_TIMESTAMP_KEY, timestamp)
      console.log('✅ 手动备份已保存')
      return { success: true, timestamp }
    } catch (err) {
      console.error('保存手动备份失败:', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * 获取手动备份信息
   * @returns {Object} 备份信息 { hasBackup, recordCount, timestamp }
   */
  getManualBackupInfo() {
    try {
      const backupData = localStorage.getItem(MANUAL_BACKUP_KEY)
      const timestamp = localStorage.getItem(MANUAL_BACKUP_TIMESTAMP_KEY)
      
      if (!backupData) {
        return { hasBackup: false, recordCount: 0 }
      }

      const data = JSON.parse(backupData)
      let count = 0
      Object.values(data).forEach(type => {
        Object.values(type).forEach(loc => {
          Object.values(loc).forEach(list => {
            count += (list || []).filter(it => it !== null).length
          })
        })
      })

      return {
        hasBackup: true,
        recordCount: count,
        timestamp: timestamp ? new Date(timestamp) : null,
      }
    } catch (err) {
      console.error('获取手动备份信息失败:', err)
      return { hasBackup: false, recordCount: 0 }
    }
  },

  /**
   * 恢复手动备份
   * @returns {Object} 操作结果
   */
  restoreManualBackup() {
    try {
      const backupData = localStorage.getItem(MANUAL_BACKUP_KEY)
      if (!backupData) {
        return { success: false, error: '没有可用的手动备份' }
      }

      const data = JSON.parse(backupData)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      this.updateEquipmentDataTimestamp()
      
      // 清除冲突检测标志，以便在下次同步时重新检测
      this.clearConflictCheckFlag()
      
      console.log('✅ 手动备份已恢复')
      return { success: true }
    } catch (err) {
      console.error('恢复手动备份失败:', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * 清除冲突检测标志（用于初始化和导入数据时）
   */
  clearConflictCheckFlag() {
    try {
      localStorage.removeItem(CONFLICT_CHECK_KEY)
      console.log('✅ 冲突检测标志已清除')
    } catch (err) {
      console.error('清除标志失败:', err)
    }
  },

  /**
   * 获取冲突检测标志
   * @returns {boolean} 是否已检测过冲突
   */
  getConflictCheckFlag() {
    try {
      return localStorage.getItem(CONFLICT_CHECK_KEY) === 'true'
    } catch (err) {
      return false
    }
  },

  /**
   * 设置冲突检测标志
   */
  setConflictCheckFlag() {
    try {
      localStorage.setItem(CONFLICT_CHECK_KEY, 'true')
    } catch (err) {
      console.error('设置标志失败:', err)
    }
  },
}

export default LocalStorageManager
