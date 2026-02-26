/**
 * 数据同步管理器
 * 处理本地数据和云端数据的同步逻辑
 */

import { LocalStorageManager } from './local-storage-manager.js'
import { AuthHandler } from './auth-handler.js'
import { ApiClient } from './api-client.js'

export const DataSync = {
  // 同步状态
  syncInProgress: false,
  lastSyncTime: null,
  syncInterval: null,
  autoSyncEnabled: true,
  autoSyncIntervalSeconds: 300, // 5分钟
  syncStatusCallback: null, // 同步状态更新回调

  /**
   * 设置同步状态更新回调
   * @param {Function} callback - 回调函数
   */
  setSyncStatusCallback(callback) {
    this.syncStatusCallback = callback
  },

  /**
   * 触发同步状态更新
   */
  notifySyncStatusUpdate() {
    if (this.syncStatusCallback) {
      this.syncStatusCallback(this.getSyncStatus())
    }
  },

  /**
   * 计算数据的哈希值（用于快速对比数据是否相同）
   * @param {Object|Array} data - 要计算哈希的数据
   * @returns {string} 哈希值
   */
  hashData(data) {
    try {
      const str = JSON.stringify(data)
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return hash.toString(36)
    } catch (err) {
      console.error('哈希计算失败:', err)
      return null
    }
  },

  /**
   * 统计本地记录总数
   * @param {Object} localData - 本地数据
   * @returns {number} 记录总数
   */
  countLocalRecords(localData) {
    let count = 0
    try {
      Object.values(localData).forEach(type => {
        Object.values(type).forEach(loc => {
          Object.values(loc).forEach(list => {
            count += (list || []).filter(it => it !== null).length
          })
        })
      })
    } catch (err) {
      console.error('统计记录失败:', err)
    }
    return count
  },

  /**
   * 检测本地与云端数据是否冲突（使用哈希对比）
   * @param {Object} localData - 本地数据
   * @param {Array} cloudRecords - 云端记录
   * @returns {boolean} 是否冲突
   */
  detectDataConflict(localData, cloudRecords) {
    try {
      const cloudDataInLocalFormat = this.convertCloudRecordsToLocal(cloudRecords)
      const localHash = this.hashData(localData)
      const cloudHash = this.hashData(cloudDataInLocalFormat)

      console.log(`🔍 数据哈希对比: 本地=${localHash}, 云端=${cloudHash}`)

      return localHash !== cloudHash
    } catch (err) {
      console.error('冲突检测失败:', err)
      return false
    }
  },

  /**
   * 初始化数据同步
   * 在应用启动时调用
   */
  async initialize() {
    console.log('📦 数据同步系统初始化...')

    // 迁移旧版本数据
    LocalStorageManager.migrateOldData()

    // 处理 OAuth 回调
    const userFromCallback = AuthHandler.handleOAuthCallback()
    if (userFromCallback) {
      console.log('✅ OAuth 登录成功:', userFromCallback.username)
      
      // 新登录时清除冲突检测标志，以便触发冲突检测
      LocalStorageManager.clearConflictCheckFlag()
      console.log('🔄 新登录，已清除冲突检测标志')
      
      // 登录后自动从云端同步数据 - 等待同步完成
      await this.syncFromCloud()
    }

    // 检查是否已认证
    if (AuthHandler.isAuthenticated()) {
      // 已认证状态，启用自动同步
      this.enableAutoSync()
    } else {
      console.log('👤 未登录，使用本地数据')
    }
  },

  /**
   * 从云端同步数据到本地
   * @returns {Promise<Object>}
   */
  async syncFromCloud() {
    if (!AuthHandler.isAuthenticated()) {
      return { success: false, error: '未认证' }
    }

    if (this.syncInProgress) {
      console.log('⏳ 同步已在进行中...')
      return { success: false, error: '同步进行中' }
    }

    this.syncInProgress = true
    this.notifySyncStatusUpdate()
    LocalStorageManager.updateSyncStatus('syncing', { direction: 'download' })

    try {
      console.log('📥 从云端拉取数据...')
      const result = await ApiClient.getRecords()

      if (result.success) {
        const records = result.records
        console.log(`✅ 获取到 ${records.length} 条云端记录`)

          // 如果云端数据与本地数据一致，跳过同步并且不要更新时间
          try {
            const cloudDataInLocalFormat = this.convertCloudRecordsToLocal(records)
            const localDataForCompare = LocalStorageManager.getEquipmentData()
            const localHash = this.hashData(localDataForCompare)
            const cloudHash = this.hashData(cloudDataInLocalFormat)

            if (localHash && cloudHash && localHash === cloudHash) {
              console.log('ℹ️ 本地与云端数据一致，跳过同步（不更新时间）')
              // 不保存、不更新时间，也不改写 sync timestamp
              return { success: true, recordCount: records.length, noChange: true }
            }
          } catch (err) {
            console.warn('比较本地与云端数据时发生错误，继续正常同步', err)
          }

          // [改进] 只在首次登录时进行冲突检测
        const localData = LocalStorageManager.getEquipmentData()
        const localRecordCount = this.countLocalRecords(localData)
        const hasCheckedConflict = LocalStorageManager.getConflictCheckFlag()

        // 关键保护：云端无数据但本地有数据 → 反向上传，不覆盖本地
        if (records.length === 0 && localRecordCount > 0) {
          console.log(`☁️ 云端无数据，本地有 ${localRecordCount} 条记录，自动上传到云端...`)
          LocalStorageManager.setConflictCheckFlag()
          this.syncInProgress = false
          this.notifySyncStatusUpdate()
          return await this.syncToCloud()
        }

        if (
          !hasCheckedConflict &&
          localRecordCount > 0 &&
          records.length > 0 &&
          this.detectDataConflict(localData, records)
        ) {
          console.warn(`⚠️ 检测到数据冲突! 本地: ${localRecordCount} 条, 云端: ${records.length} 条`)

          // 标记已检测过冲突（本次会话中只检测一次）
          LocalStorageManager.setConflictCheckFlag()

          // 获取时间戳信息
          const localTimestamp = LocalStorageManager.getEquipmentDataTimestamp()
          const cloudTimestamp = new Date()  // 使用当前时间作为云端时间

          // 显示对话框，让用户选择
          const choice = await window.YanyuApp?.AuthUI?.showConflictDialog(
            localRecordCount,
            localTimestamp,
            records.length,
            cloudTimestamp
          )

          if (choice === 'keep-local') {
            console.log('👤 用户选择: 保留本地数据，上传到云端')
            this.syncInProgress = false
            this.notifySyncStatusUpdate()
            return await this.syncToCloud()
          } else {
            console.log('☁️ 用户选择: 使用云端数据替换本地')
            // 继续使用云端数据覆盖本地
          }
        }

        // 合并云端数据到本地
        const merged = this.mergeCloudData(records)
        LocalStorageManager.saveEquipmentData(merged)

        // 立即刷新前端显示（新设备首次同步后无需手动点击）
        if (typeof window.renderNav === 'function') window.renderNav()
        if (typeof window.renderMain === 'function') window.renderMain()

        // 只有在确实有数据变更的情况下才更新时间
        this.lastSyncTime = new Date()
        LocalStorageManager.updateSyncStatus('synced', {
          direction: 'download',
          count: records.length,
          timestamp: this.lastSyncTime.toISOString(),
        })

        // 显示成功提示
        if (typeof window.YanyuApp?.UIManager?.showMessage === 'function') {
          window.YanyuApp.UIManager.showMessage(`✅ 从云端同步了 ${records.length} 条记录`, 'success', 2000)
        }

        return { success: true, recordCount: records.length }
      } else if (result.offline) {
        console.warn('⚠️ 后端离线，使用本地缓存')
        LocalStorageManager.updateSyncStatus('offline')
        
        // 显示离线提示
        if (typeof window.YanyuApp?.UIManager?.showMessage === 'function') {
          window.YanyuApp.UIManager.showMessage('⚠️ 后端离线，无法同步', 'warning', 3000)
        }
        return { success: false, offline: true, error: '后端离线' }
      } else {
        console.error('❌ 同步失败:', result.error)
        LocalStorageManager.updateSyncStatus('error', { error: result.error })
        
        // 显示错误提示
        if (typeof window.YanyuApp?.UIManager?.showMessage === 'function') {
          window.YanyuApp.UIManager.showMessage(`❌ 同步失败: ${result.error}`, 'error', 3000)
        }
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('❌ 同步异常:', err)
      LocalStorageManager.updateSyncStatus('error', { error: err.message })
      return { success: false, error: err.message }
    } finally {
      this.syncInProgress = false
      this.notifySyncStatusUpdate()
    }
  },

  /**
   * 上传本地数据到云端
   * @returns {Promise<Object>}
   */
  async syncToCloud() {
    if (!AuthHandler.isAuthenticated()) {
      return { success: false, error: '未认证' }
    }

    if (this.syncInProgress) {
      console.log('⏳ 同步已在进行中...')
      return { success: false, error: '同步进行中' }
    }

    this.syncInProgress = true
    this.notifySyncStatusUpdate()
    LocalStorageManager.updateSyncStatus('syncing', { direction: 'upload' })

    try {
      console.log('📤 上传本地数据到云端...')
      const data = LocalStorageManager.getEquipmentData()
      
      // 在上传前先检查云端是否已有相同数据，若相同则跳过上传并且不要更新时间
      try {
        const remoteCheck = await ApiClient.getRecords()
        if (remoteCheck.success) {
          const remoteInLocal = this.convertCloudRecordsToLocal(remoteCheck.records)
          const localHash = this.hashData(data)
          const remoteHash = this.hashData(remoteInLocal)
          if (localHash && remoteHash && localHash === remoteHash) {
            console.log('ℹ️ 本地数据与云端一致，跳过上传（不更新时间）')
            return { success: true, noChange: true }
          }
        }
      } catch (err) {
        console.warn('上传前比较云端数据失败，继续上传', err)
      }

      // 使用新的批量导入接口上传所有数据
      const result = await ApiClient.importData(data)

      if (result.success) {
        this.lastSyncTime = new Date()
        LocalStorageManager.updateSyncStatus('synced', {
          direction: 'upload',
          timestamp: this.lastSyncTime.toISOString(),
        })

        console.log('✅ 数据上传成功')
        
        // 显示成功提示
        if (typeof window.YanyuApp?.UIManager?.showMessage === 'function') {
          const dataSize = Object.keys(LocalStorageManager.getEquipmentData()).length
          window.YanyuApp.UIManager.showMessage(`✅ 已上传 ${dataSize} 个类别的数据`, 'success', 2000)
        }
        return { success: true }
      } else if (result.offline) {
        console.warn('⚠️ 后端离线')
        LocalStorageManager.updateSyncStatus('offline')
        
        // 显示离线提示
        if (typeof window.YanyuApp?.UIManager?.showMessage === 'function') {
          window.YanyuApp.UIManager.showMessage('⚠️ 后端离线，无法上传', 'warning', 3000)
        }
        return { success: false, offline: true, error: '后端离线' }
      } else {
        console.error('❌ 上传失败:', result.error)
        LocalStorageManager.updateSyncStatus('error', { error: result.error })
        
        // 显示错误提示
        if (typeof window.YanyuApp?.UIManager?.showMessage === 'function') {
          window.YanyuApp.UIManager.showMessage(`❌ 上传失败: ${result.error}`, 'error', 3000)
        }
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('❌ 上传异常:', err)
      LocalStorageManager.updateSyncStatus('error', { error: err.message })
      return { success: false, error: err.message }
    } finally {
      this.syncInProgress = false
      this.notifySyncStatusUpdate()
    }
  },

  /**
   * 双向同步（云端 -> 本地 -> 云端）
   * @returns {Promise<Object>}
   */
  async syncBidirectional() {
    if (!AuthHandler.isAuthenticated()) {
      return { success: false, error: '未认证' }
    }

    // 1. 先从云端拉取最新数据
    const pullResult = await this.syncFromCloud()
    if (!pullResult.success) {
      return pullResult
    }

    // 2. 然后推送本地的新增/修改数据
    const pushResult = await this.syncToCloud()
    return pushResult
  },

  /**
   * 合并云端数据到本地
   * 优先保留云端的较新数据
   * @param {Array} cloudRecords - 云端记录
   * @returns {Object} 合并后的数据
   */
  mergeCloudData(cloudRecords) {
    // 全量替换策略：用云端数据完全替换本地数据
    // 这确保了本地与后端数据的一致性
    // 不使用增量合并，避免因合并逻辑导致的数据不一致问题
    const cloudData = this.convertCloudRecordsToLocal(cloudRecords)
    return cloudData
  },

  /**
   * 将云端记录格式转换为本地格式
   * @param {Array} records - 云端记录
   * @returns {Object} 本地格式数据
   */
  convertCloudRecordsToLocal(records) {
    const result = {}

    records.forEach((record) => {
      const { equipment_type, location, equipment_name, quality, attributes, special_attr } = record

      if (!result[equipment_type]) {
        result[equipment_type] = {}
      }
      if (!result[equipment_type][location]) {
        result[equipment_type][location] = {}
      }
      if (!result[equipment_type][location][equipment_name]) {
        result[equipment_type][location][equipment_name] = []
      }

      // 处理 attributes：可能是字符串或对象
      let parsedAttributes = []
      if (attributes) {
        if (typeof attributes === 'string') {
          try {
            parsedAttributes = JSON.parse(attributes)
          } catch (e) {
            console.warn('Failed to parse attributes string:', attributes)
            parsedAttributes = []
          }
        } else if (typeof attributes === 'object') {
          parsedAttributes = attributes
        }
      }

      result[equipment_type][location][equipment_name].push({
        q: quality,
        attrs: parsedAttributes,
        special: special_attr || "",
        k: !!record.is_favorite,
      })
    })

    return result
  },

  /**
   * 启用自动同步
   */
  enableAutoSync() {
    if (this.syncInterval) return

    console.log(`🔄 启用自动同步（间隔：${this.autoSyncIntervalSeconds}秒）`)

    // 只有在下列情况下才立即触发一次同步：
    // - 最近通过 OAuth 回调刚登录（handleOAuthCallback 会单独触发）
    // - 本地最后同步时间不存在或已超过自动同步间隔
    try {
      const lastLocalTimestamp = LocalStorageManager.getEquipmentDataTimestamp()
      const lastSyncMillis = lastLocalTimestamp ? new Date(lastLocalTimestamp).getTime() : null
      const ageSeconds = lastSyncMillis ? ((Date.now() - lastSyncMillis) / 1000) : Infinity

      if (!lastLocalTimestamp || ageSeconds > this.autoSyncIntervalSeconds) {
        // 仅当本地没有同步记录或已超时才立即同步一次
        this.syncFromCloud().catch(err => {
          console.warn('首次自动同步失败:', err)
        })
      } else {
        console.log('ℹ️ 本地数据最近已同步，首次自动同步被跳过')
      }
    } catch (err) {
      console.warn('检查本地同步时间失败，仍尝试立即同步一次', err)
      this.syncFromCloud().catch(err2 => {
        console.warn('首次自动同步失败:', err2)
      })
    }

    // 定期同步（仅启动定时器，实际执行前会再检查认证）
    this.syncInterval = setInterval(() => {
      if (AuthHandler.isAuthenticated()) {
        this.syncFromCloud().catch(err => {
          console.warn('自动同步失败:', err)
        })
      }
    }, this.autoSyncIntervalSeconds * 1000)
  },

  /**
   * 禁用自动同步
   */
  disableAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('🛑 自动同步已禁用')
    }
  },

  /**
   * 获取最后同步时间
   * @returns {Date|null}
   */
  getLastSyncTime() {
    return this.lastSyncTime
  },

  /**
   * 获取同步状态摘要
   * @returns {Object}
   */
  getSyncStatus() {
    const user = AuthHandler.getUser()
    const status = LocalStorageManager.getSyncStatus()
    const storageUsage = LocalStorageManager.getStorageUsage()

    // 统计本地记录数
    const db = JSON.parse(localStorage.getItem('yanyu_v24_db') || '{}')
    let totalRecords = 0
    Object.values(db).forEach(type => {
      Object.values(type).forEach(loc => {
        Object.values(loc).forEach(list => {
          totalRecords += (list || []).filter(it => it !== null).length
        })
      })
    })

    // syncedRecords 取决于上次同步时返回的云端记录数
    // 如果最后一次同步是下载操作，使用云端记录数；否则使用本地总数
    const syncedCount = status.extra?.count || totalRecords

    // 从 localStorage 中读取最后同步时间
    const lastSyncTimeFromStorage = status.timestamp || this.lastSyncTime

    return {
      authenticated: AuthHandler.isAuthenticated(),
      user: user ? { username: user.username, id: user.id, avatar: user.avatar } : null,
      syncStatus: status,
      lastSyncTime: lastSyncTimeFromStorage,
      autoSyncEnabled: this.autoSyncEnabled,
      isSyncing: this.syncInProgress,
      syncedRecords: syncedCount,
      totalRecords: totalRecords,
      storageUsage,
      storageWarning: LocalStorageManager.checkStorageWarning(),
    }
  },

  /**
   * 清空数据（同时清空本地和云端，需谨慎）
   * @returns {Promise<Object>}
   */
  async clearAllData() {
    if (!confirm('确实要清空所有数据吗？此操作不可撤销！')) {
      return { success: false, error: '操作已取消' }
    }

    try {
      // 清空本地
      LocalStorageManager.clearEquipmentData()
      console.log('✅ 本地数据已清空')

      // 如果已认证且后端可用，也清空云端
      if (AuthHandler.isAuthenticated()) {
        // TODO: 调用后端的批量删除接口
        console.log('⚠️ 云端数据清空功能待实现')
      }

      return { success: true, message: '数据已清空' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}

export default DataSync
