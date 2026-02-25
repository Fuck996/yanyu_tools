/**
 * API 客户端
 * 与后端通信的中央管理器
 */

import { AuthHandler } from './auth-handler.js'

const API_URL = window.__API_URL__ || 'http://localhost:3000/api'

// 检查后端是否可用
let backendAvailable = null

async function checkBackendAvailability() {
  if (backendAvailable !== null) return backendAvailable

  try {
    const response = await fetch(`${API_URL}/health`, { 
      method: 'GET',
      timeout: 2000,
    })
    backendAvailable = response.ok
    return backendAvailable
  } catch (err) {
    console.warn('后端不可用:', err.message)
    backendAvailable = false
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
      const response = await fetch(`${API_URL}/auth/user`)
      if (response.ok) {
        const user = await response.json()
        return { success: true, user }
      }
      return { success: false, error: '获取用户信息失败' }
    } catch (err) {
      return { success: false, offline: true, error: err.message }
    }
  },
}

export default ApiClient
