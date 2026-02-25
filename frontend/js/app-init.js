/**
 * 应用初始化入口
 * 整合所有模块并初始化应用
 * 
 * 如何使用：
 * 在 index.html 的 </body> 前添加：
 * <script type="module" src="js/app-init.js"></script>
 */

console.log('🟢🟢🟢 [app-init.js] 模块化脚本开始加载!')

// ⚠️ 最优先：立即定义版本号到 window 对象
window.__FRONTEND_VERSION__ = '4.8.2'
window.__FRONTEND_BUILD_DATE__ = '2026-02-25'
console.log(`✅ [app-init.js TOP] 版本号已设置到 window: ${window.__FRONTEND_VERSION__}`)

console.log('📝 [app-init.js] 开始导入模块...')

// 版本号定义 - 也在模块中备份
const FRONTEND_VERSION = '4.8.2'
const FRONTEND_BUILD_DATE = '2026-02-25'

// 暴露到 window（备用）
window.FRONTEND_VERSION = FRONTEND_VERSION
window.FRONTEND_BUILD_DATE = FRONTEND_BUILD_DATE
console.log(`✅ [app-init.js] 版本号也已暴露到 window.FRONTEND_VERSION: ${FRONTEND_VERSION}`)

import { AuthHandler } from './auth-handler.js'
import { LocalStorageManager } from './local-storage-manager.js'
import { DataSync } from './data-sync.js'
import { ApiClient } from './api-client.js'
import { UIManager } from './ui-manager.js'

console.log('✅ [app-init.js] 所有模块导入完成')

// ✅ 立即暴露全局对象（即使初始化未完成）
console.log('📝 [app-init.js] 最顶层：准备暴露 window.YanyuApp')

// 暂时使用空对象，后面会填充
if (!window.YanyuApp) {
  window.YanyuApp = {
    FRONTEND_VERSION,
    FRONTEND_BUILD_DATE,
    backendStatus: null,  // 后端状态
  }
  console.log('✅ [app-init.js] window.YanyuApp 已初始化为空对象')
}

// ========== 认证 UI 管理器 ==========
const AuthUI = {
  dropdownOpen: false,

  /**
   * 初始化认证 UI
   * 检查 OAuth 回调和本地存储的用户信息
   */
  async init() {
    console.log('🔐 [AuthUI] 初始化认证界面...')
    
    // 第一步：检查是否有 OAuth 回调（用户刚刚登录）
    console.log('🔍 [AuthUI] 检查 OAuth 回调...')
    const user = AuthHandler.handleOAuthCallback()
    console.log('📊 [AuthUI] handleOAuthCallback() 返回:', user)
    
    if (user) {
      console.log('✅ [AuthUI] GitHub 登录成功:', user.username)
      console.log('📊 [AuthUI] 用户对象详情:', JSON.stringify(user))
      this.updateUI(user)
      return
    }
    
    // 第二步：如果没有回调，检查本地存储的用户信息（用户之前登过）
    console.log('🔍 [AuthUI] 检查本地存储的用户信息...')
    const savedUser = AuthHandler.getUser()
    console.log('📊 [AuthUI] getUser() 返回:', savedUser)
    
    if (savedUser) {
      console.log('✅ [AuthUI] 使用保存的用户信息:', savedUser.username)
      console.log('📊 [AuthUI] 用户对象详情:', JSON.stringify(savedUser))
      this.updateUI(savedUser)
      return
    }
    
    console.log('👤 [AuthUI] 未登录，显示登录按钮')
    this.updateUI(null)
  },

  /**
   * 登录
   */
  login() {
    console.log('📝 [AuthUI] login() 方法被调用')
    console.log('📝 [AuthUI] 调用 AuthHandler.loginWithGitHub()')
    AuthHandler.loginWithGitHub()
  },

  /**
   * 登出
   */
  async logout() {
    if (confirm('确定要退出登录吗？')) {
      AuthHandler.logout()
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
    console.log('🔄 [AuthUI] 下拉菜单已切换:', this.dropdownOpen ? '打开' : '关闭')
  },

  /**
   * 关闭下拉菜单
   */
  closeDropdown() {
    const dropdown = document.getElementById('authDropdown')
    if (!dropdown) {
      console.error('❌ [AuthUI] 找不到下拉菜单元素')
      return
    }
    this.dropdownOpen = false
    dropdown.classList.remove('active')
    console.log('✖️ [AuthUI] 下拉菜单已关闭')
  },

  /**
   * 切换用户面板下拉（登录后）
   */
  toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown')
    if (!dropdown) {
      console.error('❌ [AuthUI] 找不到用户下拉菜单元素')
      return
    }
    this.userDropdownOpen = !this.userDropdownOpen
    // 互斥：如果打开用户下拉，则关闭通用菜单
    if (this.userDropdownOpen) {
      this.closeDropdown()
    }
    dropdown.classList.toggle('active', this.userDropdownOpen)
    console.log('🔄 [AuthUI] 用户下拉已切换:', this.userDropdownOpen ? '打开' : '关闭')
  },

  /**
   * 关闭用户面板下拉
   */
  closeUserDropdown() {
    const dropdown = document.getElementById('userDropdown')
    if (!dropdown) {
      console.error('❌ [AuthUI] 找不到用户下拉菜单元素')
      return
    }
    this.userDropdownOpen = false
    dropdown.classList.remove('active')
    console.log('✖️ [AuthUI] 用户下拉已关闭')
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
      this.updateSyncStatus()
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
   * 更新同步状态显示
   * 不论认证状态如何，总是显示连接状态和备份信息
   */
  async updateSyncStatus() {
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

    // 总是显示主容器和状态卡片
    statusBackupContainer.style.display = 'block'
    headerStatusCard.style.display = 'flex'
    
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
        console.log('📝 [updateSyncStatus] 开始获取备份列表...')
        loadingIndicator.style.display = 'none'
        failureIndicator.style.display = 'none'
        
        const backupListResult = await ApiClient.getBackupList()
        console.log('📥 [updateSyncStatus] 收到备份列表结果:', {
          success: backupListResult.success,
          backupCount: backupListResult.backups?.length,
          backups: backupListResult.backups
        })
        
        if (backupListResult.success && backupListResult.backups && backupListResult.backups.length > 0) {
          const formatTime = (date) => {
            if (!date) return '未知'
            return new Date(date).toLocaleString('zh-CN')
          }
          
          // 显示自动备份（在上）
          const autoBackup = backupListResult.backups.find(b => b.backupType === 'auto')
          if (autoBackup) {
            console.log('✅ [updateSyncStatus] 找到自动备份')
            autoBackupItem.style.display = 'flex'
            document.getElementById('autoBackupCount').style.display = 'none'
            document.querySelector('#autoBackupItem .backup-item-header').textContent = `⏱️ 自动备份(${autoBackup.recordCount}条)`
            document.getElementById('autoBackupTime').textContent = `${formatTime(autoBackup.timestamp)}`
          } else {
            autoBackupItem.style.display = 'none'
          }
          
          // 显示手动备份（在下）
          const manualBackup = backupListResult.backups.find(b => b.backupType === 'manual')
          if (manualBackup) {
            console.log('✅ [updateSyncStatus] 找到手动备份')
            manualBackupItem.style.display = 'flex'
            document.getElementById('manualBackupCount').style.display = 'none'
            document.querySelector('#manualBackupItem .backup-item-header').textContent = `📪 手动备份(${manualBackup.recordCount}条)`
            document.getElementById('manualBackupTime').textContent = `${formatTime(manualBackup.timestamp)}`
          } else {
            manualBackupItem.style.display = 'none'
          }
        } else {
          console.log('📭 [updateSyncStatus] 没有任何备份')
          manualBackupItem.style.display = 'none'
          autoBackupItem.style.display = 'none'
        }
      } catch (err) {
        console.error('❌ [updateSyncStatus] 获取备份列表失败:', err.message)
        // 显示失败状态
        manualBackupItem.style.display = 'none'
        autoBackupItem.style.display = 'none'
        loadingIndicator.style.display = 'none'
        failureIndicator.style.display = 'flex'
      }
    } else {
      // 未认证状态：显示"数据获取中"或"获取失败"
      manualBackupItem.style.display = 'none'
      autoBackupItem.style.display = 'none'
      
      // 检查是否连接失败
      const backendOnline = await this.checkBackendHealth()
      if (!backendOnline) {
        loadingIndicator.style.display = 'none'
        failureIndicator.style.display = 'flex'
      } else {
        loadingIndicator.style.display = 'flex'
        failureIndicator.style.display = 'none'
      }
    }
  }
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
      UIManager.showMessage('✅ 装备数据已清空，页面将刷新', 'success', 1500)
      setTimeout(() => location.reload(), 1500)
      return { success: true }
    }
    return { success: false, error: '用户取消' }
  },

  /**
   * 保存手动备份（同时保存到本地和服务器）
   */
  async saveManualBackup() {
    console.log('📝 [saveManualBackup] 开始保存手动备份...')
    // 直接保存到后端服务器（不保存本地副本）
    try {
      const result = await ApiClient.saveBackup('manual')
      console.log('📥 [saveManualBackup] 收到结果:', result)
      if (result.success) {
        console.log('✅ [saveManualBackup] 备份成功，更新同步状态')
        UIManager.showMessage(`✅ 备份已保存到服务器 (${result.recordCount} 条记录)`, 'success', 2000)
        AuthUI.updateSyncStatus()
        return result
      } else {
        console.warn('⚠️ [saveManualBackup] 备份失败:', result.error)
        UIManager.showMessage(`❌ 备份保存失败: ${result.error}`, 'error', 3000)
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('❌ [saveManualBackup] 异常:', err.message, err)
      UIManager.showMessage(`❌ 备份保存失败: ${err.message}`, 'error', 3000)
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
        console.log('📝 [autoBackup] 未认证，跳过自动备份')
        return { success: false, error: '未认证' }
      }

      console.log('📝 [autoBackup] 开始自动备份...')
      const result = await ApiClient.saveBackup('auto')
      
      if (result.success) {
        console.log('✅ [autoBackup] 自动备份成功:', {
          recordCount: result.recordCount,
          timestamp: result.timestamp
        })
        // 自动更新同步状态显示
        AuthUI.updateSyncStatus()
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

    // 1. 注册同步状态回调
    console.log('📝 [initializeApp] 注册同步状态回调...')
    DataSync.setSyncStatusCallback(() => {
      AuthUI.updateSyncStatus()
    })
    console.log('✅ [initializeApp] 同步回调已注册')

    // 2. 初始化认证 UI
    console.log('📦 初始化认证系统...')
    await AuthUI.init()
    console.log('✅ [initializeApp] 认证系统初始化完成')

    // 3. 初始化数据同步系统
    console.log('📦 初始化数据同步...')
    await DataSync.initialize()
    console.log('✅ [initializeApp] 数据同步初始化完成')

    // 3.5 定期检查后端状态（每10秒检查一次，仅在已认证时）
    setInterval(() => {
      if (AuthHandler.isAuthenticated()) {
        AuthUI.updateSyncStatus()
      }
    }, 10000)

    // 3.6 初始化时立即显示连接状态
    console.log('📝 [initializeApp] 初始化连接状态显示...')
    await AuthUI.updateSyncStatus()
    console.log('✅ [initializeApp] 连接状态显示初始化完成')
    console.log('✅ [initializeApp] 后端状态监控已启动')

    // 3.6 启动自动备份机制
    console.log('📦 启动自动备份机制...')
    // 页面加载时立即进行一次自动备份
    if (AuthHandler.isAuthenticated()) {
      console.log('📝 [initializeApp] 页面加载时进行首次自动备份')
      setTimeout(() => {
        window.YanyuApp.autoBackup()
      }, 1000)
    }
    // 设置定时自动备份（每10分钟）
    setInterval(() => {
      if (AuthHandler.isAuthenticated()) {
        console.log('⏱️ [initializeApp] 触发定时自动备份')
        window.YanyuApp.autoBackup()
      }
    }, 10 * 60 * 1000)  // 10分钟
    console.log('✅ [initializeApp] 自动备份机制已启动（每10分钟一次）')

    // 页面卸载前进行自动备份
    window.addEventListener('beforeunload', () => {
      if (AuthHandler.isAuthenticated()) {
        console.log('📝 [initializeApp] 页面卸载前进行自动备份')
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
    console.log('✅ [initializeApp] 页面卸载前自动备份已注册')

    // 4. 检查存储警告
    if (LocalStorageManager.checkStorageWarning()) {
      setTimeout(() => UIManager.showStorageWarning(), 2000)
    }

    // 5. 显示初始化完成
    const status = DataSync.getSyncStatus()
    if (status.authenticated) {
      console.log(`✅ 已认证为: ${status.user.username}`)
    } else {
      console.log('👤 未登录，使用本地缓存')
    }

    // 5.5 显示版本号
    console.log('📝 [initializeApp] 更新版本号显示...')
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
    console.log('📝 [initializeApp] 版本号已添加到 window.YanyuApp')
    
    // 尝试获取后端版本号
    try {
      const baseUrl = AuthHandler.getGitHubAuthUrl().replace('/auth/github', '')
      const versionUrl = `${baseUrl}/version`
      console.log('📝 [initializeApp] 获取后端版本号，URL:', versionUrl)
      
      const versionResponse = await fetch(versionUrl)
      if (versionResponse.ok) {
        const versionData = await versionResponse.json()
        if (beVersionEl && versionData.backend) {
          beVersionEl.textContent = versionData.backend
          console.log(`✅ 后端版本已显示: ${versionData.backend}`)
        }
      } else {
        console.warn('⚠️ 后端版本查询失败，状态码:', versionResponse.status)
        if (beVersionEl) {
          beVersionEl.textContent = '未连接'
        }
      }
    } catch (err) {
      console.warn('⚠️ 无法获取后端版本号:', err.message)
      if (beVersionEl) {
        beVersionEl.textContent = '未连接'
      }
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
