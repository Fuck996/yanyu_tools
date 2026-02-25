/**
 * 应用初始化入口
 * 整合所有模块并初始化应用
 * 
 * 如何使用：
 * 在 index.html 的 </body> 前添加：
 * <script type="module" src="js/app-init.js"></script>
 */

// ⚠️ 最优先：立即定义版本号到 window 对象
window.__FRONTEND_VERSION__ = '1.1.0'
window.__FRONTEND_BUILD_DATE__ = '2026-02-25'

// 版本号定义 - 也在模块中备份
const FRONTEND_VERSION = '1.1.0'
const FRONTEND_BUILD_DATE = '2026-02-25'

// 暴露到 window（备用）
window.FRONTEND_VERSION = FRONTEND_VERSION
window.FRONTEND_BUILD_DATE = FRONTEND_BUILD_DATE

import { AuthHandler } from './auth-handler.js'
import { LocalStorageManager } from './local-storage-manager.js'
import { DataSync } from './data-sync.js'
import { ApiClient } from './api-client.js'
import { UIManager } from './ui-manager.js'

// ✅ 立即暴露全局对象（即使初始化未完成）
// 暂时使用空对象，后面会填充
if (!window.YanyuApp) {
  window.YanyuApp = {
    FRONTEND_VERSION,
    FRONTEND_BUILD_DATE,
    backendStatus: null,  // 后端状态
  }
}

// ========== 认证 UI 管理器 ==========
const AuthUI = {
  dropdownOpen: false,
  pollingTimer: null,  // 轮询定时器
  pollingStarted: false,  // 轮询是否已启动
  isUpdatingStatus: false,  // 防止并发调用 updateSyncStatus

  /**
   * 初始化认证 UI
   * 检查 OAuth 回调和本地存储的用户信息
   */
  async init() {
    // 第一步：检查是否有 OAuth 回调（用户刚刚登录）
    const user = AuthHandler.handleOAuthCallback()
    
    if (user) {
      console.log('✅ 已登录:', user.username)
      this.updateUI(user)
      // 登录成功后更新备份状态
      await this.updateSyncStatus()
      return
    }
    
    // 第二步：如果没有回调，检查本地存储的用户信息（用户之前登过）
    const savedUser = AuthHandler.getUser()
    
    if (savedUser) {
      this.updateUI(savedUser)
      // 恢复登录状态后也要显示备份信息
      await this.updateSyncStatus()
      return
    }
    
    // 第三步：未登录，显示登录按钮但也要显示连接状态
    this.updateUI(null)
    await this.updateSyncStatus()
  },

  /**
   * 登录
   */
  login() {
    AuthHandler.loginWithGitHub()
  },

  /**
   * 登出
   */
  async logout() {
    if (confirm('确定要退出登录吗？')) {
      AuthHandler.logout()
      this.stopPolling()
      this.updateUI(null)
      location.reload()
    }
  },

  /**
   * 切换下拉菜单
   */
  toggleDropdown() {
    const dropdown = document.getElementById('authDropdown')
    if (!dropdown) {
      console.error('❌ [AuthUI] 找不到下拉菜单元素')
      return
    }
    this.dropdownOpen = !this.dropdownOpen
    // 互斥：如果打开通用菜单，则关闭用户下拉
    if (this.dropdownOpen) {
      this.closeUserDropdown()
    }
    dropdown.classList.toggle('active', this.dropdownOpen)
  },

  /**
   * 关闭下拉菜单
   */
  closeDropdown() {
    const dropdown = document.getElementById('authDropdown')
    if (!dropdown) {
      return
    }
    this.dropdownOpen = false
    dropdown.classList.remove('active')
  },

  /**
   * 切换用户面板下拉（登录后）
   */
  toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown')
    if (!dropdown) {
      return
    }
    this.userDropdownOpen = !this.userDropdownOpen
    // 互斥：如果打开用户下拉，则关闭通用菜单
    if (this.userDropdownOpen) {
      this.closeDropdown()
    }
    dropdown.classList.toggle('active', this.userDropdownOpen)
  },

  /**
   * 关闭用户面板下拉
   */
  closeUserDropdown() {
    const dropdown = document.getElementById('userDropdown')
    if (!dropdown) {
      return
    }
    this.userDropdownOpen = false
    dropdown.classList.remove('active')
  },

  /**
   * 访问项目
   */
  visitProject() {
    const projectUrl = 'https://github.com/Fuck996/yanyu_tools' // 请替换为实际的项目地址
    window.open(projectUrl, '_blank')
  },

  /**
   * 显示数据冲突对话框
   * @param {number} localRecordCount - 本地记录数
   * @param {Date} localTimestamp - 本地最后修改时间
   * @param {number} cloudRecordCount - 云端记录数
   * @param {Date} cloudTimestamp - 云端最后修改时间
   * @returns {Promise<string>} 用户选择："keep-local" 或 "use-cloud"
   */
  async showConflictDialog(localRecordCount, localTimestamp, cloudRecordCount, cloudTimestamp) {
    return new Promise((resolve) => {
      const formatTime = (date) => {
        if (!date) return '无'
        return new Date(date).toLocaleString('zh-CN')
      }

      const html = `
        <div class="conflict-overlay">
          <div class="conflict-box">
            <h3>⚠️ 检测到数据冲突</h3>
            <p>本地数据与云端不一致，请选择操作：</p>
            
            <div class="conflict-info-section">
              <div class="info-item">
                <span class="label">📁 本地数据</span>
                <span class="count">${localRecordCount} 条记录</span>
                <span class="time">修改时间: ${formatTime(localTimestamp)}</span>
              </div>
              <div class="info-item">
                <span class="label">☁️ 云端数据</span>
                <span class="count">${cloudRecordCount} 条记录</span>
                <span class="time">修改时间: ${formatTime(cloudTimestamp)}</span>
              </div>
            </div>
            
            <div class="conflict-options">
              <button class="btn-keep-local" data-choice="keep-local">
                💾 保留本地数据
                <small>上传本地数据到云端，覆盖云端数据</small>
              </button>
              <button class="btn-use-cloud" data-choice="use-cloud">
                ☁️ 使用云端数据
                <small>用云端数据覆盖本地数据</small>
              </button>
            </div>
          </div>
        </div>
      `

      const dialog = document.createElement('div')
      dialog.innerHTML = html
      document.body.appendChild(dialog)

      // 处理用户选择
      dialog.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const choice = btn.dataset.choice
          dialog.remove()
          resolve(choice)
        })
      })
    })
  },

  /**
   * 更新 UI 显示（根据用户登录状态）
   * @param {Object|null} user - 用户对象或 null（未登录）
   */
  updateUI(user) {
    // 获取所有必要的 DOM 元素
    const loginBtn = document.getElementById('loginBtn')
    const userPanel = document.getElementById('userPanel')
    const userAvatar = document.getElementById('userAvatar')
    const userName = document.getElementById('userName')
    const userStatus = document.getElementById('userStatus')
    const defaultAvatar = document.getElementById('defaultAvatar')

    // 检查所有必要元素是否存在
    const missingElements = []
    if (!loginBtn) missingElements.push('loginBtn')
    if (!userPanel) missingElements.push('userPanel')
    if (!userAvatar) missingElements.push('userAvatar')
    if (!userName) missingElements.push('userName')

    if (missingElements.length > 0) {
      console.error('❌ [AuthUI] 找不到必要的 DOM 元素:', missingElements.join(', '))
      return
    }

    if (user) {
      // 隐藏登录按钮，显示用户面板
      if (loginBtn) loginBtn.style.display = 'none'
      if (userPanel) userPanel.style.display = 'flex'
      if (defaultAvatar) defaultAvatar.style.display = 'none'

      // 设置头部用户信息
      const avatar = user.avatar || user.avatar_url || 'https://avatars.githubusercontent.com/u/1?v=4'
      
      if (userAvatar) {
        userAvatar.src = avatar
        userAvatar.alt = user.username
        userAvatar.onerror = () => {
          userAvatar.src = 'https://avatars.githubusercontent.com/u/1?v=4'
        }
      }
      
      if (userName) {
        userName.textContent = user.username
      }

      // 关闭通用菜单（如果打开）
      this.closeDropdown()
      // 关闭用户下拉（确保初始关闭）
      this.closeUserDropdown()
      
      // 更新同步状态
      // 注意：在这里不调用，让 init() 的调用处理
    } else {
      // 显示登录按钮，隐藏用户面板
      if (loginBtn) {
        loginBtn.style.display = 'block'
        // 直接使用 onclick 确保覆盖旧的事件处理器，避免由多次调用导致的绑定问题
        loginBtn.onclick = () => {
          this.login()
        }
      }
      if (userPanel) userPanel.style.display = 'none'
      if (defaultAvatar) defaultAvatar.style.display = 'inline-block'
      this.closeDropdown()
      this.closeUserDropdown()
    }
  },

  /**
   * 检查后端健康状态
   */
  async checkBackendHealth() {
    try {
      const available = await ApiClient.isBackendEnabled()
      return !!available
    } catch (err) {
      console.warn('后端健康检查失败:', err.message)
      return false
    }
  },

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
      this.pollingStarted = false
    }
  },

  /**
   * 启动10分钟的轮询
   */
  startPolling() {
    if (this.pollingStarted) {
      return
    }
    this.pollingStarted = true
    
    // 设置10分钟后的下一次检查
    this.pollingTimer = setInterval(() => {
      if (AuthHandler.isAuthenticated()) {
        this.updateSyncStatus().catch(err => console.warn('轮询更新失败:', err.message))
      }
    }, 10 * 60 * 1000)  // 10分钟
  },

  /**
   * 更新同步状态显示
   * 不论认证状态如何，总是显示连接状态和备份信息
   * 添加防并发机制，防止多个 updateSyncStatus 同时执行
   */
  async updateSyncStatus() {
    // 防止并发调用
    if (this.isUpdatingStatus) {
      return
    }
    this.isUpdatingStatus = true
    
    try {
    const headerStatusCard = document.getElementById('headerStatusCard')
    const headerStatusIcon = document.getElementById('headerStatusIcon')
    const headerStatusText = document.getElementById('headerStatusText')
    const headerStatusExtra = document.getElementById('headerStatusExtra')
    const statusBackupContainer = document.getElementById('statusBackupContainer')
    const manualBackupItem = document.getElementById('manualBackupItem')
    const autoBackupItem = document.getElementById('autoBackupItem')
    const loadingIndicator = document.getElementById('loadingIndicator')
    const failureIndicator = document.getElementById('failureIndicator')
    const status = DataSync.getSyncStatus()

    // 总是显示主容器和状态卡片（添加null检查）
    if (statusBackupContainer) {
      statusBackupContainer.style.display = 'block'
    }
    
    if (headerStatusCard) {
      headerStatusCard.style.display = 'flex'
    }
    
    // 首先更新连接状态
    if (status.isSyncing) {
      // 正在同步
      if (headerStatusIcon) headerStatusIcon.textContent = '⏳'
      if (headerStatusText) headerStatusText.textContent = '正在同步中'
      if (headerStatusExtra) headerStatusExtra.textContent = `${status.syncedRecords}/${status.totalRecords}`
    } else {
      // 检查后端在线状态
      const backendOnline = await this.checkBackendHealth()
      window.YanyuApp.backendStatus = backendOnline
      
      if (headerStatusIcon) headerStatusIcon.textContent = backendOnline ? '✔' : '✖'
      if (headerStatusText) headerStatusText.textContent = backendOnline ? '已连接' : '连接失败'
      if (headerStatusExtra) headerStatusExtra.textContent = ''
    }

    // 只有在认证时才显示备份信息
    if (status.authenticated) {
      // 获取并显示备份状态
      try {
        if (loadingIndicator) loadingIndicator.style.display = 'none'
        if (failureIndicator) failureIndicator.style.display = 'none'
        
        const backupListResult = await ApiClient.getBackupList()
        
        if (backupListResult.success && backupListResult.backups && backupListResult.backups.length > 0) {
          // 成功获取备份数据，启动轮询
          this.startPolling()
          
          const formatTime = (date) => {
            if (!date) return '未知'
            return new Date(date).toLocaleString('zh-CN')
          }
          
          // 显示自动备份（在上）
          const autoBackup = backupListResult.backups.find(b => b.backupType === 'auto')
          if (autoBackup) {
            if (autoBackupItem) {
              autoBackupItem.style.display = 'flex'
              const autoCountEl = document.getElementById('autoBackupCount')
              if (autoCountEl) autoCountEl.style.display = 'none'
              const autoHeaderEl = document.querySelector('#autoBackupItem .backup-item-header')
              if (autoHeaderEl) autoHeaderEl.textContent = `⏱️ 自动备份(${autoBackup.recordCount}条)`
              const autoTimeEl = document.getElementById('autoBackupTime')
              if (autoTimeEl) autoTimeEl.textContent = `${formatTime(autoBackup.timestamp)}`
            }
          } else {
            if (autoBackupItem) autoBackupItem.style.display = 'none'
          }
          
          // 显示手动备份（在下）
          const manualBackup = backupListResult.backups.find(b => b.backupType === 'manual')
          if (manualBackup) {
            if (manualBackupItem) {
              manualBackupItem.style.display = 'flex'
              const manualCountEl = document.getElementById('manualBackupCount')
              if (manualCountEl) manualCountEl.style.display = 'none'
              const manualHeaderEl = document.querySelector('#manualBackupItem .backup-item-header')
              if (manualHeaderEl) manualHeaderEl.textContent = `📪 手动备份(${manualBackup.recordCount}条)`
              const manualTimeEl = document.getElementById('manualBackupTime')
              if (manualTimeEl) manualTimeEl.textContent = `${formatTime(manualBackup.timestamp)}`
            }
          } else {
            if (manualBackupItem) manualBackupItem.style.display = 'none'
          }
        } else {
          if (manualBackupItem) manualBackupItem.style.display = 'none'
          if (autoBackupItem) autoBackupItem.style.display = 'none'
        }
      } catch (err) {
        console.warn('获取备份列表失败:', err.message)
        // 显示失败状态
        if (manualBackupItem) manualBackupItem.style.display = 'none'
        if (autoBackupItem) autoBackupItem.style.display = 'none'
        if (loadingIndicator) loadingIndicator.style.display = 'none'
        if (failureIndicator) failureIndicator.style.display = 'flex'
      }
    } else {
      // 未认证状态：显示"数据获取中"或"获取失败"
      if (manualBackupItem) manualBackupItem.style.display = 'none'
      if (autoBackupItem) autoBackupItem.style.display = 'none'
      
      // 检查是否连接失败
      const backendOnline = await this.checkBackendHealth()
      if (!backendOnline) {
        if (loadingIndicator) loadingIndicator.style.display = 'none'
        if (failureIndicator) failureIndicator.style.display = 'flex'
      } else {
        if (loadingIndicator) loadingIndicator.style.display = 'flex'
        if (failureIndicator) failureIndicator.style.display = 'none'
      }
    }    } finally {
      this.isUpdatingStatus = false
    }  }
}

// 将所有模块和方法填充到 window.YanyuApp
console.log('📝 [app-init.js] 填充 window.YanyuApp 对象中的模块...')
Object.assign(window.YanyuApp, {
  // 版本信息
  FRONTEND_VERSION,
  FRONTEND_BUILD_DATE,
  
  // 核心模块
  AuthHandler,
  LocalStorageManager,
  DataSync,
  ApiClient,
  UIManager,
  AuthUI,

  /**
   * 获取同步状态摘要
   */
  getSyncStatus() {
    return DataSync.getSyncStatus()
  },

  /**
   * 主动触发同步（从云端下载）
   */
  async syncFromCloud() {
    UIManager.showSyncProgress('📥 正在同步云端数据...')
    const result = await DataSync.syncFromCloud()
    UIManager.hideSyncProgress()

    if (result.success) {
      UIManager.showMessage(
        `✅ 云端数据同步完成 (${result.recordCount} 条记录)`,
        'success'
      )
    } else if (result.offline) {
      UIManager.showMessage('💾 后端离线，使用本地缓存', 'warning')
    } else {
      UIManager.showMessage('❌ 同步失败: ' + result.error, 'error')
    }

    return result
  },

  /**
   * 主动触发同步（上传到云端）
   */
  async syncToCloud() {
    if (!AuthHandler.isAuthenticated()) {
      UIManager.showMessage('❌ 请先登录 GitHub', 'error')
      return { success: false, error: '未认证' }
    }

    UIManager.showSyncProgress('📤 正在上传数据到云端...')
    const result = await DataSync.syncToCloud()
    UIManager.hideSyncProgress()

    if (result.success) {
      UIManager.showMessage('✅ 数据已上传到云端', 'success')
    } else if (result.offline) {
      UIManager.showMessage('💾 后端离线，请稍后重试', 'warning')
    } else {
      UIManager.showMessage('❌ 上传失败: ' + result.error, 'error')
    }

    return result
  },

  /**
   * 导出本地数据为 JSON 文件
   */
  exportData() {
    const exportData = LocalStorageManager.exportData()
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yanyu_export_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    UIManager.showMessage('✅ 数据已导出', 'success')
  },

  /**
   * 导入 JSON 数据文件
   */
  importData(file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target.result)
        const result = LocalStorageManager.importData(importData)

        if (result.success) {
          // 导入数据后，清除冲突检测标志，以便下次同步时重新检测
          LocalStorageManager.clearConflictCheckFlag()
          UIManager.showMessage('✅ 数据导入成功，页面将刷新', 'success', 1500)
          setTimeout(() => location.reload(), 1500)
        } else {
          UIManager.showMessage('❌ 导入失败: ' + result.error, 'error', 3000)
        }
      } catch (err) {
        UIManager.showMessage('❌ 文件格式错误: ' + err.message, 'error', 3000)
      }
    }
    reader.onerror = (err) => {
      UIManager.showMessage('❌ 文件读取失败: ' + err.message, 'error', 3000)
    }
    reader.readAsText(file)
  },

  /**
   * 清空所有数据
   */
  async clearAllData() {
    return DataSync.clearAllData()
  },

  /**
   * 只清空装备数据，保留登录信息
   */
  clearEquipmentDataOnly() {
    if (confirm('确认清空所有装备数据？登录信息将保留。')) {
      LocalStorageManager.clearEquipmentData()
      UIManager.showMessage('✅ 装备数据已清空', 'success', 1000)
      
      // 清空后立即进行一次自动备份
      if (AuthHandler.isAuthenticated()) {
        window.YanyuApp.autoBackup().then(() => {
          console.log('✅ 清空后已自动备份')
          // 更新状态显示
          AuthUI.updateSyncStatus().then(() => {
            UIManager.showMessage('✅ 已保存备份，页面将刷新', 'success', 1500)
            setTimeout(() => location.reload(), 1500)
          })
        })
      } else {
        setTimeout(() => location.reload(), 1500)
      }
      return { success: true }
    }
    return { success: false, error: '用户取消' }
  },

  /**
   * 保存手动备份（同时保存到本地和服务器）
   */
  async saveManualBackup() {
    // 直接保存到后端服务器（不保存本地副本）
    try {
      const result = await ApiClient.saveBackup('manual')
      if (result.success) {
        UIManager.showMessage(`✅ 备份已保存 (${result.recordCount} 条)`, 'success', 2000)
        // 强制刷新备份显示（绕过并发限制）
        const wasUpdating = AuthUI.isUpdatingStatus
        AuthUI.isUpdatingStatus = false
        await AuthUI.updateSyncStatus()
        if (!wasUpdating) AuthUI.isUpdatingStatus = false
        return result
      } else {
        UIManager.showMessage(`❌ 备份失败: ${result.error}`, 'error', 3000)
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('❌ 备份异常:', err.message)
      UIManager.showMessage(`❌ 备份失败: ${err.message}`, 'error', 3000)
      return { success: false, error: err.message }
    }
  },

  /**
   * 恢复手动备份（直接恢复最新的手动备份，不需要选择）
   */
  async restoreManualBackup() {
    // 从服务器获取备份列表
    const backupListResult = await ApiClient.getBackupList()
    
    if (!backupListResult.success || !backupListResult.backups || backupListResult.backups.length === 0) {
      UIManager.showMessage('⚠️ 没有可用的备份', 'warning', 2000)
      return { success: false, error: '没有备份' }
    }
    
    // 查找最新的手动备份
    const manualBackup = backupListResult.backups.find(b => b.backupType === 'manual')
    
    if (!manualBackup) {
      UIManager.showMessage('⚠️ 没有手动备份', 'warning', 2000)
      return { success: false, error: '没有手动备份' }
    }

    // 显示确认对话框
    const backupDate = new Date(manualBackup.timestamp).toLocaleString('zh-CN')
    if (confirm(`确认恢复手动备份吗？\n时间: ${backupDate}\n记录数: ${manualBackup.recordCount}\n\n这会覆盖当前的本地数据。`)) {
      const result = await ApiClient.restoreBackup(manualBackup.id)
      if (result.success) {
        UIManager.showMessage('✅ 备份已恢复，页面将刷新', 'success', 1500)
        setTimeout(() => location.reload(), 1500)
        return result
      } else {
        UIManager.showMessage(`❌ 恢复失败: ${result.error}`, 'error', 3000)
        return result
      }
    }
    return { success: false, error: '用户取消' }
  },

  /**
   * 获取存储使用情况
   */
  getStorageUsage() {
    return {
      usage: LocalStorageManager.getStorageUsage(),
      warning: LocalStorageManager.checkStorageWarning(),
    }
  },

  /**
   * 自动备份（静默备份，不显示提示）
   * 在定时任务或页面卸载时调用
   */
  async autoBackup() {
    try {
      if (!AuthHandler.isAuthenticated()) {
        return { success: false, error: '未认证' }
      }

      const result = await ApiClient.saveBackup('auto')
      
      if (result.success) {
        console.log('✅ 自动备份: ' + result.recordCount + ' 条')
        // 强制刷新备份显示
        const wasUpdating = this.isUpdatingStatus
        this.isUpdatingStatus = false
        await AuthUI.updateSyncStatus()
        if (!wasUpdating) this.isUpdatingStatus = false
        return result
      } else {
        console.warn('⚠️ [autoBackup] 自动备份失败:', result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('❌ [autoBackup] 自动备份异常:', err.message)
      return { success: false, error: err.message }
    }
  },
})

console.log('✅ [app-init.js] window.YanyuApp 已填充所有模块')

/**
 * 应用初始化函数
 * 初始化所有模块，包括认证、数据同步、存储等
 */
async function initializeApp() {
  try {
    console.log(`🚀 烟雨江湖装备录入工具 V${FRONTEND_VERSION} (前后端分离版)`)
    console.log('=' .repeat(50))
    
    console.log('✅ [initializeApp] window.YanyuApp 已就位:', !!window.YanyuApp)

    // 1. 注册同步状态回调（仅用于本地数据变化）
    console.log('� [initializeApp] 注册同步状态回调...')
    DataSync.setSyncStatusCallback(() => {
      // 仅在数据实际同步变化时显示同步状态
      AuthUI.updateSyncStatus().catch(err => console.warn('同步状态更新失败:', err))
    })

    // 2. 初始化认证 UI
    console.log('🔐 初始化认证系统...')
    await AuthUI.init()

    // 3. 初始化数据同步系统
    console.log('📦 初始化数据同步...')
    await DataSync.initialize()

    // 3.6 启动自动备份机制
    console.log('📦 启动自动备份机制...')
    // 页面加载时立即进行一次自动备份
    if (AuthHandler.isAuthenticated()) {
      setTimeout(() => {
        window.YanyuApp.autoBackup()
      }, 1000)
    }
    // 设置定时自动备份（每10分钟）
    setInterval(() => {
      if (AuthHandler.isAuthenticated()) {
        window.YanyuApp.autoBackup()
      }
    }, 10 * 60 * 1000)  // 10分钟

    // 页面卸载前进行自动备份
    window.addEventListener('beforeunload', () => {
      if (AuthHandler.isAuthenticated()) {
        // 使用 navigator.sendBeacon 以确保请求在页面卸载前完成
        const token = AuthHandler.getToken()
        if (token) {
          const backendUrl = window.__API_URL__ || 'https://yanyu-tools-backend-production.up.railway.app'
          try {
            navigator.sendBeacon(
              `${backendUrl}/api/equipment/save-backup`,
              JSON.stringify({ backupType: 'auto' })
            )
          } catch (e) {
            console.warn('⚠️ 页面卸载时自动备份失败:', e.message)
          }
        }
      }
    })

    // 4. 检查存储警告
    if (LocalStorageManager.checkStorageWarning()) {
      setTimeout(() => UIManager.showStorageWarning(), 2000)
    }

    // 5. 显示初始化完成
    const status = DataSync.getSyncStatus()
    if (status.authenticated) {
      console.log(`✅ 已认证为: ${status.user.username}`)
    }

    // 5.5 显示版本号
    const feVersionEl = document.getElementById('fe-version')
    const beVersionEl = document.getElementById('be-version')
    
    // 从 window 对象获取版本号（确保是全局的）
    const frontendVersion = window.__FRONTEND_VERSION__ || window.FRONTEND_VERSION || FRONTEND_VERSION || 'unknown'
    
    if (feVersionEl) {
      feVersionEl.textContent = frontendVersion
      console.log(`✅ 前端版本已显示: ${frontendVersion}`)
    }
    
    // 暴露到 YanyuApp
    window.YanyuApp.FRONTEND_VERSION = frontendVersion
    window.YanyuApp.FRONTEND_BUILD_DATE = window.__FRONTEND_BUILD_DATE__ || window.FRONTEND_BUILD_DATE || FRONTEND_BUILD_DATE || 'unknown'
    
    // 获取并显示后端版本号
    try {
      const versionResponse = await fetch('/api/version')
      if (versionResponse.ok) {
        const versionData = await versionResponse.json()
        if (beVersionEl && versionData.backend) {
          beVersionEl.textContent = versionData.backend
          
          // 检查版本是否一致
          if (versionData.backend !== frontendVersion) {
            console.warn(`⚠️ 前后端版本不一致: 前端=${frontendVersion}, 后端=${versionData.backend}`)
          } else {
            console.log(`✅ 版本一致: ${frontendVersion}`)
          }
        }
      } else {
        if (beVersionEl) beVersionEl.textContent = '版本查询失败'
        console.warn('⚠️ 后端版本查询失败，状态码:', versionResponse.status)
      }
    } catch (err) {
      console.warn('⚠️ 无法获取后端版本号:', err.message)
      if (beVersionEl) beVersionEl.textContent = '版本获取失败'
    }

    console.log('✅ 应用初始化完成')
    console.log('=' .repeat(50))
    console.log('💡 使用 window.YanyuApp 访问所有 API')

    // 6. 设置全局事件监听：点击其他地方关闭下拉菜单（考虑 control-panel、user-dropdown）
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.control-panel') && !e.target.closest('.auth-dropdown') && !e.target.closest('.user-dropdown') && !e.target.closest('.user-panel')) {
        AuthUI.closeDropdown()
        AuthUI.closeUserDropdown()
      }
    })
  } catch (err) {
    console.error('❌ [initializeApp] 初始化失败:', err)
    console.error('错误堆栈:', err.stack)
  }
}

// 在 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}
