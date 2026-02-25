/**
 * GitHub OAuth 认证处理器
 * 处理登录、登出、Token 验证等
 */

console.log('🟢 [auth-handler.js] 模块已加载')

// 优先使用构建/页面注入的全局 `window.__API_URL__`，否则回退到生产后端地址
const getAPIUrl = () => {
  const prod = 'https://yanyu-tools-backend-production.up.railway.app/api'
  if (window.__API_URL__) {
    console.log('✅ [getAPIUrl] 使用页面注入的 API_URL:', window.__API_URL__)
    return window.__API_URL__
  }
  console.warn('⚠️ [getAPIUrl] window.__API_URL__ 未设置，使用生产后端:', prod)
  return prod
}

const API_URL = getAPIUrl()
const OAUTH_TOKEN_KEY = 'yanyu_oauth_token'

console.log('🔗 Backend API URL:', API_URL)

export const AuthHandler = {
  /**
   * 获取 GitHub OAuth 认证 URL
   * @returns {string} 认证 URL
   */
  getGitHubAuthUrl() {
    // 如果有后端，使用后端的 OAuth 端点
    return `${API_URL}/auth/github`
  },

  /**
   * 启动 GitHub 登录流程
   */
  loginWithGitHub() {
    const authUrl = this.getGitHubAuthUrl()
    console.log('🔐 [AuthHandler] 开始 GitHub 登录流程')
    console.log('🔐 [AuthHandler] 重定向到:', authUrl)
    window.location.href = authUrl
  },

  /**
   * 处理 OAuth 回调（从 URL 参数获取 Token）
   * 从后端重定向回来时，URL 中会携带 token 参数
   * @returns {Object|null} 用户信息对象，若无则返回 null
   */
  handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const username = params.get('user')

    console.log('🔍 检查 OAuth 回调参数...')
    console.log('  token:', token ? '✓ 已收到' : '✗ 未收到')
    console.log('  username:', username || '✗ 未收到')

    if (token) {
      try {
        // 使用浏览器原生 atob 解码 Base64，并处理 UTF-8 字符
        const decodedToken = decodeURIComponent(escape(atob(token)))
        console.log('✅ Token 已解码')
        
        const userInfo = JSON.parse(decodedToken)
        console.log('✅ 用户信息:', userInfo)
        
        // 保存 token 和用户信息
        this.setToken(token)
        this.setUser(userInfo)
        console.log('✅ 用户信息已保存到 localStorage')

        // 清除 URL 参数，保持 URL 干净
        // 注意：这里需要保留 /frontend/index.html 路径
        window.history.replaceState({}, document.title, window.location.pathname)
        console.log('✅ URL 参数已清除')

        return userInfo
      } catch (err) {
        console.error('❌ Token 解析失败:', err.message)
        console.error('原始 token:', token)
        return null
      }
    }

    return null
  },

  /**
   * 保存 OAuth Token
   * @param {string} token - Base64 编码的 token
   */
  setToken(token) {
    localStorage.setItem(OAUTH_TOKEN_KEY, token)
  },

  /**
   * 获取 OAuth Token
   * @returns {string|null} Token 或 null
   */
  getToken() {
    return localStorage.getItem(OAUTH_TOKEN_KEY)
  },

  /**
   * 保存用户信息
   * @param {Object} userInfo - 用户信息
   */
  setUser(userInfo) {
    localStorage.setItem('yanyu_user_info', JSON.stringify(userInfo))
  },

  /**
   * 获取当前登录用户
   * @returns {Object|null} 用户信息或 null
   */
  getUser() {
    try {
      const user = localStorage.getItem('yanyu_user_info')
      return user ? JSON.parse(user) : null
    } catch (err) {
      return null
    }
  },

  /**
   * 检查是否已认证
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken()
  },

  /**
   * 验证 Token 有效性
   * @returns {Promise<boolean>}
   */
  async verifyToken() {
    const token = this.getToken()
    if (!token) return false

    try {
      const response = await fetch(`${API_URL}/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.valid
      }
      return false
    } catch (err) {
      console.error('Token 验证失败:', err)
      return false
    }
  },

  /**
   * 登出
   * @returns {Promise<Object>} 操作结果
   */
  async logout() {
    try {
      // 清除本地认证信息
      localStorage.removeItem(OAUTH_TOKEN_KEY)
      localStorage.removeItem('yanyu_user_info')

      // 尝试调用后端登出接口
      try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST' })
      } catch (err) {
        // 后端不可用时忽略
        console.warn('后端登出失败（可能后端未运行）:', err)
      }

      return { success: true, message: '已登出' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * 获取用户头像 URL
   * @returns {string|null} 头像 URL 或 null
   */
  getUserAvatar() {
    const user = this.getUser()
    return user?.avatar_url || null
  },

  /**
   * 获取用户用户名
   * @returns {string|null}
   */
  getUsername() {
    const user = this.getUser()
    return user?.username || user?.login || null
  },

  /**
   * 获取用户 ID
   * @returns {string|number|null}
   */
  getUserId() {
    const user = this.getUser()
    return user?.id || user?.github_id || null
  },
}

