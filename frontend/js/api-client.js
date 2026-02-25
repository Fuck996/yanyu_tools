/**
 * API 客户端
 * 与后端通信的中央管理器
 */

import { AuthHandler } from './auth-handler.js'

// 必须使用生产 API URL - 绝不允许 localhost fallback
const API_URL = window.__API_URL__ || 'https://yanyu-tools-backend-production.up.railway.app/api'
if (!window.__API_URL__) {
  console.warn('⚠️ window.__API_URL__ not set, using production backend fallback')
}

// 检查后端是否可用（每次都重新检查，不缓存结果）
async function checkBackendAvailability() {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      timeout: 2000,
      credentials: 'include',
    })
    return response.ok
  } catch (err) {
    console.warn('后端不可用:', err.message)
    return false
  }
}

export const ApiClient = {
  /**
   * 是否已启用后端
   * @returns {Promise<boolean>}
   */
  async isBackendEnabled() {
    return checkBackendAvailability()
  },

  /**
   * 上传/保存装备记录
   * @param {Object} record - 装备记录
   * @returns {Promise<Object>}
   */
  async saveRecord(record) {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(record),
      })

      if (response.ok) {
        return await response.json()
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期，请重新登录' }
      } else {
        return { success: false, error: '保存失败' }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 获取用户的所有装备记录
   * @returns {Promise<Array>}
   */
  async getRecords() {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行', records: [] }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证', records: [] }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        const records = await response.json()
        return { success: true, records }
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期', records: [] }
      } else {
        return { success: false, error: '获取失败', records: [] }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message, records: [] }
    }
  },

  /**
   * 获取用户的统计信息（记录数等）
   * @returns {Promise<Object>}
   */
  async getStats() {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, recordCount: 0 }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证', recordCount: 0 }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        return await response.json()
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期', recordCount: 0 }
      } else {
        return { success: false, error: '获取失败', recordCount: 0 }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message, recordCount: 0 }
    }
  },

  /**
   * 更新装备记录
   * @param {string} recordId - 记录 ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>}
   */
  async updateRecord(recordId, updateData) {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        return await response.json()
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期' }
      } else {
        return { success: false, error: '更新失败' }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 删除装备记录
   * @param {string} recordId - 记录 ID
   * @returns {Promise<Object>}
   */
  async deleteRecord(recordId) {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        return await response.json()
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期' }
      } else {
        return { success: false, error: '删除失败' }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 批量导入装备数据到云端
   * @param {Object} data - 装备数据对象（本地存储格式）
   * @returns {Promise<Object>}
   */
  async importData(data) {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ data }),
      })

      if (response.ok) {
        return await response.json()
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期，请重新登录' }
      } else {
        const body = await response.json()
        return { success: false, error: body.error || '导入失败' }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 导出用户数据
   * @returns {Promise<Object>}
   */
  async exportData() {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        const records = await response.json()
        return { success: true, records }
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期' }
      } else {
        return { success: false, error: '导出失败' }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 获取当前用户信息
   * @returns {Promise<Object>}
   */
  async getCurrentUser() {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true }
    }

    try {
      const response = await fetch(`${API_URL}/auth/user`, { credentials: 'include' })
      if (response.ok) {
        const user = await response.json()
        return { success: true, user }
      }
      return { success: false, error: '获取用户信息失败' }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 保存手动备份到服务器
   * @param {string} backupType - 备份类型 ('manual' 或 'auto')
   * @returns {Promise<Object>}
   */
  async saveBackup(backupType = 'manual') {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const url = `${API_URL}/equipment/save-backup`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ backupType }),
      })

      if (response.ok) {
        const result = await response.json()
        return result
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期，请重新登录' }
      } else {
        return { success: false, error: '备份失败' }
      }
    } catch (err) {
      console.error('❌ 备份异常:', err.message)
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 清空后端的所有装备数据
   */
  async clearBackendData() {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const url = `${API_URL}/equipment/clear-data`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        return await response.json()
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期，请重新登录' }
      } else {
        return { success: false, error: '清空失败' }
      }
    } catch (err) {
      console.error('❌ 清空后端数据异常:', err.message)
      return { success: false, offline: true, error: err.message }
    }
  },

  /**
   * 获取备份列表
   * @returns {Promise<Object>}
   */
  async getBackupList() {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行', backups: [] }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证', backups: [] }
    }

    try {
      const url = `${API_URL}/equipment/backups`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        const result = await response.json()
        return result
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期', backups: [] }
      } else {
        const errorText = await response.text()
        console.error(`❌ [getBackupList] 获取备份列表失败 (${response.status}):`, errorText)
        return { success: false, error: '获取备份列表失败', backups: [] }
      }
    } catch (err) {
      console.error('❌ [getBackupList] 请求异常:', err.message)
      return { success: false, offline: true, error: err.message, backups: [] }
    }
  },

  /**
   * 恢复指定备份
   * @param {string} backupId - 备份 ID
   * @returns {Promise<Object>}
   */
  async restoreBackup(backupId) {
    const available = await this.isBackendEnabled()
    if (!available) {
      return { success: false, offline: true, error: '后端未运行' }
    }

    const token = AuthHandler.getToken()
    if (!token) {
      return { success: false, error: '未认证' }
    }

    try {
      const response = await fetch(`${API_URL}/equipment/restore-backup/${backupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        return await response.json()
      } else if (response.status === 401) {
        return { success: false, error: '认证已过期' }
      } else {
        return { success: false, error: '恢复失败' }
      }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },
}

export default ApiClient
