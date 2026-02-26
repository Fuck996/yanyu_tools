/**
 * UI 管理器
 * 处理认证界面的显示和更新
 * 不修改 index.html，而是通过 JavaScript 动态创建 UI 元素
 */

import { AuthHandler } from './auth-handler.js'
import { DataSync } from './data-sync.js'
import { LocalStorageManager } from './local-storage-manager.js'
import { ApiClient } from './api-client.js'

const PANEL_ID = 'yanyu-auth-panel'
const STATUS_ID = 'yanyu-status-message'
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>')

export const UIManager = {
  /**
   * 初始化认证面板
   * 在页面加载完成后调用
   */
  initAuthPanel() {
    // 检查面板是否已存在
    if (document.getElementById(PANEL_ID)) {
      this.updateAuthPanel()
      return
    }

    // 创建认证面板
    const panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.className = 'yanyu-auth-panel'
    panel.innerHTML = `
      <div class="yanyu-auth-content">
        <!-- 登录状态显示 -->
        <div id="yanyu-login-status" class="yanyu-login-status">
          <button id="yanyu-login-btn" class="yanyu-btn-login" title="使用 GitHub 账号登录">
            🔐 登录 GitHub
          </button>
        </div>

        <!-- 用户信息显示 -->
        <div id="yanyu-user-info" class="yanyu-user-info" style="display: none;">
          <img id="yanyu-user-avatar" class="yanyu-user-avatar" alt="头像">
          <span id="yanyu-user-name" class="yanyu-user-name"></span>
          <button id="yanyu-logout-btn" class="yanyu-btn-logout" title="退出登录">
            退出
          </button>
        </div>

        <!-- 状态显示 -->
        <div id="yanyu-sync-status" class="yanyu-sync-status">
          <span id="yanyu-sync-indicator"></span>
        </div>
      </div>
    `

    // 添加样式
    this.injectStyles()

    // 添加到页面
    document.body.insertBefore(panel, document.body.firstChild)

    // 绑定事件
    this.bindEvents()

    // 更新界面
    this.updateAuthPanel()
  },

  /**
   * 注入 CSS 样式
   */
  injectStyles() {
    // 检查样式是否已注入
    if (document.getElementById('yanyu-auth-styles')) {
      return
    }

    const style = document.createElement('style')
    style.id = 'yanyu-auth-styles'
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 15px;
        right: 15px;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgb(42, 42, 42);
        border-radius: 30px;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .yanyu-auth-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .yanyu-login-status {
        display: flex;
      }

      .yanyu-btn-login {
        background: linear-gradient(135deg, rgb(52, 152, 219), rgb(155, 89, 182));
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 13px;
        font-weight: bold;
        transition: all 0.3s;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      .yanyu-btn-login:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
      }

      .yanyu-user-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .yanyu-user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid rgb(42, 42, 42);
        cursor: pointer;
      }

      .yanyu-user-name {
        font-size: 13px;
        color: rgb(224, 224, 224);
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .yanyu-btn-logout {
        background: rgb(37, 37, 37);
        color: rgb(224, 224, 224);
        border: 1px solid rgb(42, 42, 42);
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      .yanyu-btn-logout:hover {
        background: rgb(231, 76, 60);
        border-color: rgb(231, 76, 60);
      }

      .yanyu-sync-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: rgb(136, 136, 136);
        padding-left: 12px;
        border-left: 1px solid rgb(42, 42, 42);
      }

      .yanyu-sync-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgb(136, 136, 136);
      }

      .yanyu-sync-indicator.syncing {
        background: rgb(52, 152, 219);
        animation: pulse 1s infinite;
      }

      .yanyu-sync-indicator.synced {
        background: rgb(46, 204, 113);
      }

      .yanyu-sync-indicator.error {
        background: rgb(231, 76, 60);
      }

      .yanyu-sync-indicator.offline {
        background: rgb(241, 196, 15);
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Toast 容器 - 左下角固定，新条从底部滑入、向上堆叠 */
      #yanyu-toast-container {
        position: fixed;
        bottom: max(20px, env(safe-area-inset-bottom, 20px));
        left: max(16px, env(safe-area-inset-left, 16px));
        z-index: 9998;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: min(320px, calc(100vw - 32px));
        pointer-events: none;
        /* 新条添加到底部，内部元素从底部顶起如 flex-column */
      }

      /* 消息提示框 - 在容器内堆叠 */
      .yanyu-status-message {
        padding: 12px 16px;
        background: rgb(26, 26, 26);
        border: 1px solid rgb(42, 42, 42);
        border-radius: 8px;
        font-size: 13px;
        color: rgb(224, 224, 224);
        animation: slideInUp 0.28s ease-out;
        box-sizing: border-box;
        word-break: break-word;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        pointer-events: auto;
        /* 高度过渡，便于退出动画平滑收起 */
        overflow: hidden;
        max-height: 80px;
        transition: max-height 0.3s ease, padding 0.3s ease, margin 0.3s ease;
      }

      .yanyu-status-message.hiding {
        animation: slideOutDown 0.28s ease-in forwards;
        pointer-events: none;
      }

      .yanyu-status-message.info {
        background: rgba(52, 152, 219, 0.1);
        border-color: rgb(52, 152, 219);
        color: rgb(52, 152, 219);
      }

      .yanyu-status-message.success {
        background: rgba(46, 204, 113, 0.1);
        border-color: rgb(46, 204, 113);
        color: rgb(46, 204, 113);
      }

      .yanyu-status-message.error {
        background: rgba(231, 76, 60, 0.1);
        border-color: rgb(231, 76, 60);
        color: rgb(231, 76, 60);
      }

      .yanyu-status-message.warning {
        background: rgba(241, 196, 15, 0.1);
        border-color: rgb(241, 196, 15);
        color: rgb(241, 196, 15);
      }

      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideOutDown {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(16px);
        }
      }

      /* 浅色主题 */
      [data-theme="light"] #${PANEL_ID} {
        background: rgba(255, 255, 255, 0.8);
        border-color: rgb(220, 221, 225);
      }

      [data-theme="light"] .yanyu-user-name {
        color: rgb(47, 53, 66);
      }

      [data-theme="light"] .yanyu-btn-logout {
        background: rgb(241, 242, 246);
        color: rgb(47, 53, 66);
        border-color: rgb(220, 221, 225);
      }

      [data-theme="light"] .yanyu-sync-status {
        color: rgb(99, 110, 114);
        border-left-color: rgb(220, 221, 225);
      }
    `
    document.head.appendChild(style)
  },

  /**
   * 绑定事件处理器
   */
  bindEvents() {
    const loginBtn = document.getElementById('yanyu-login-btn')
    const logoutBtn = document.getElementById('yanyu-logout-btn')
    const userAvatar = document.getElementById('yanyu-user-avatar')

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.handleLogin()
      })
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout()
      })
    }

    if (userAvatar) {
      userAvatar.addEventListener('click', () => {
        this.showUserProfile()
      })
    }
  },

  /**
   * 处理登录
   */
  handleLogin() {
    console.log('🔐 启动 GitHub 登录流程...')
    AuthHandler.loginWithGitHub()
  },

  /**
   * 处理登出
   */
  async handleLogout() {
    if (!confirm('确定要退出登录吗？')) {
      return
    }

    const result = await AuthHandler.logout()
    if (result.success) {
      // 禁用自动同步
      DataSync.disableAutoSync()

      // 更新 UI
      this.updateAuthPanel()
      this.showMessage('已退出登录', 'info')

      // 页面重新加载
      setTimeout(() => {
        location.reload()
      }, 500)
    } else {
      this.showMessage('退出失败: ' + result.error, 'error')
    }
  },

  /**
   * 显示用户资料
   */
  showUserProfile() {
    const user = AuthHandler.getUser()
    if (!user) return

    const profileHTML = `
      <div style="text-align: center;">
        <img src="${user.avatar_url || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}';this.onerror=null" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px;">
        <p style="margin: 5px 0;"><strong>${user.username || user.login}</strong></p>
        <p style="margin: 5px 0; font-size: 12px;">${user.email || '(未公开)'}</p>
        <p style="margin: 8px 0; font-size: 11px; color: #888;">
          ID: ${user.id}<br>
          创建于: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        </p>
      </div>
    `

    alert(profileHTML)
  },

  /**
   * 更新认证面板
   */
  updateAuthPanel() {
    const isAuthenticated = AuthHandler.isAuthenticated()
    const loginStatus = document.getElementById('yanyu-login-status')
    const userInfo = document.getElementById('yanyu-user-info')

    if (isAuthenticated) {
      const user = AuthHandler.getUser()
      if (user) {
        loginStatus.style.display = 'none'
        userInfo.style.display = 'flex'

        const avatar = document.getElementById('yanyu-user-avatar')
        const username = document.getElementById('yanyu-user-name')

        avatar.src = user.avatar_url || DEFAULT_AVATAR
        avatar.onerror = () => { avatar.src = DEFAULT_AVATAR; avatar.onerror = null }
        username.textContent = user.username || user.login || 'User'
      }
    } else {
      loginStatus.style.display = 'block'
      userInfo.style.display = 'none'
    }

    // 更新同步状态指示器
    this.updateSyncIndicator()
  },

  /**
   * 更新同步状态指示器
   */
  updateSyncIndicator() {
    const indicator = document.getElementById('yanyu-sync-indicator')
    if (!indicator) return

    const status = DataSync.getSyncStatus()
    const syncState = status.syncStatus.state

    // 移除所有状态类
    indicator.classList.remove('syncing', 'synced', 'error', 'offline')

    // 添加当前状态类
    if (syncState === 'syncing') {
      indicator.classList.add('syncing')
    } else if (syncState === 'synced') {
      indicator.classList.add('synced')
    } else if (syncState === 'error') {
      indicator.classList.add('error')
    } else if (syncState === 'offline') {
      indicator.classList.add('offline')
    }

    // 额外检测后端可用性：仅在已认证时调用后端检查，避免未登录时产生网络请求
    if (!AuthHandler.isAuthenticated()) return

    try {
      ApiClient.isBackendEnabled().then((available) => {
        if (!available && AuthHandler.isAuthenticated()) {
          indicator.classList.remove('syncing', 'synced', 'offline')
          indicator.classList.add('error')
        }
      }).catch((err) => {
        if (AuthHandler.isAuthenticated()) {
          indicator.classList.remove('syncing', 'synced', 'offline')
          indicator.classList.add('error')
        }
      })
    } catch (e) {
      if (AuthHandler.isAuthenticated()) {
        indicator.classList.remove('syncing', 'synced', 'offline')
        indicator.classList.add('error')
      }
    }
  },

  /**
   * 显示状态消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 ('info', 'success', 'error', 'warning')
   * @param {number} duration - 显示时长（毫秒），0 表示不自动隐藏
   */
  /**
   * 获取或创建 toast 容器（懒初始化）
   */
  getToastContainer() {
    let container = document.getElementById('yanyu-toast-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'yanyu-toast-container'
      document.body.appendChild(container)
    }
    return container
  },

  /**
   * 带动画移除一条 toast
   * @param {HTMLElement} el
   */
  _removeToast(el) {
    if (!el || !el.parentNode) return
    el.classList.add('hiding')
    // 等待动画完成后移除 DOM
    el.addEventListener('animationend', () => {
      if (el.parentNode) el.remove()
    }, { once: true })
    // 保险超时墙防动画没有触发
    setTimeout(() => { if (el.parentNode) el.remove() }, 400)
  },

  /**
   * 显示状态消息（悬浮 toast，左下角，最多 3 条）
   * @param {string} message - 消息内容
   * @param {string} type - info / success / error / warning
   * @param {number} duration - 显示时长 ms，0 表示不自动隐藏
   */
  showMessage(message, type = 'info', duration = 5000) {
    const MAX = 3
    const container = this.getToastContainer()

    // 超出最大数时，立即清除最旧的一条
    while (container.childElementCount >= MAX) {
      const oldest = container.firstElementChild
      if (oldest) this._removeToast(oldest)
      else break
    }

    const messageEl = document.createElement('div')
    messageEl.className = `yanyu-status-message ${type}`
    messageEl.textContent = message
    // 新消息添加到底部（appendChild = flex-column 最后）
    container.appendChild(messageEl)

    if (duration > 0) {
      setTimeout(() => this._removeToast(messageEl), duration)
    }

    return messageEl
  },

  /**
   * 显示同步进度
   */
  showSyncProgress(message) {
    const existing = document.querySelector('[data-sync-progress]')
    if (existing) {
      existing.remove()
    }

    const progressEl = document.createElement('div')
    progressEl.setAttribute('data-sync-progress', 'true')
    progressEl.className = 'yanyu-status-message info'
    progressEl.textContent = message

    this.getToastContainer().appendChild(progressEl)
    return progressEl
  },

  /**
   * 隐藏同步进度
   */
  hideSyncProgress() {
    const progressEl = document.querySelector('[data-sync-progress]')
    if (progressEl) {
      progressEl.remove()
    }
  },

  /**
   * 显示存储警告
   */
  showStorageWarning() {
    const usage = LocalStorageManager.getStorageUsage()
    this.showMessage(
      `⚠️ 本地存储接近上限 (${usage})，建议登录账号以使用云端存储`,
      'warning',
      5000
    )
  },
}

export default UIManager
