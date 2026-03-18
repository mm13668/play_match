// pages/note/send/send.js
const app = getApp()

Page({
  data: {
    content: '',
    maxLength: 200,
    remainingCount: 200,
    loading: false,
    hasUserInfo: false,
    userInfo: null,
    remainingShells: 0,
    avatars: []
  },

  // 生成随机头像位置
  generateRandomAvatars() {
    const avatars = []
    const colors = ['#FFB6C1', '#FFC0CB', '#FFA07A', '#FFDAB9', '#FFE4E1', '#F08080', '#FA8072', '#FF6B6B']
    
    // 生成20-30个随机头像
    const count = 20 + Math.floor(Math.random() * 10)
    
    for (let i = 0; i < count; i++) {
      const size = 40 + Math.floor(Math.random() * 80)
      const left = Math.random() * 100
      const bottom = Math.random() * 100
      const color = colors[Math.floor(Math.random() * colors.length)]
      const opacity = 0.3 + Math.random() * 0.4
      
      avatars.push({
        style: `
          width: ${size}rpx;
          height: ${size}rpx;
          left: ${left}%;
          bottom: ${bottom}%;
          background: ${color};
          opacity: ${opacity};
          transform: translateY(${Math.random() * 40 - 20}rpx);
        `.replace(/\s+/g, ' ').trim()
      })
    }
    
    this.setData({ avatars })
  },

  onLoad() {
    this.checkUserInfo()
    this.generateRandomAvatars()
  },

  onShow() {
    this.loadUserInfo()
  },

  // 检查用户信息是否完整
  checkUserInfo() {
    const openid = app.globalData.openid
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/my/my'
            })
          } else {
            wx.navigateBack()
          }
        }
      })
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo 
    // 检查是否有基本用户信息，昵称可能存在于不同字段
    const hasnickname = userInfo && userInfo.nickname
    if (userInfo && hasnickname) {
      this.setData({
        hasUserInfo: true,
        userInfo
      })
      this.calculateRemainingShells()
    } else {
      this.setData({
        hasUserInfo: false
      })
    }
  },

  // 计算剩余贝壳
  calculateRemainingShells() {
    if (!app.globalData.userInfo) return
    
    const { total_shells = 0, total_used = 0 } = app.globalData.userInfo
    const remaining = Math.max(0, total_shells - total_used)
    this.setData({
      remainingShells: remaining
    })
  },

  // 输入内容变化
  onInputChange(e) {
    const content = e.detail.value
    const remainingCount = this.data.maxLength - content.length
    this.setData({
      content,
      remainingCount
    })
  },

  // 发送纸条
  onSend() {
    const { content, remainingShells } = this.data

    if (!content.trim()) {
      wx.showToast({
        title: '请输入纸条内容',
        icon: 'none'
      })
      return
    }

    if (content.length > this.data.maxLength) {
      wx.showToast({
        title: `内容不能超过${this.data.maxLength}字`,
        icon: 'none'
      })
      return
    }

    if (remainingShells < 1) {
      this.showNoShellsDialog()
      return
    }

    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'createNote',
      data: {
        content: content.trim()
      },
      success: (res) => {
        this.setData({ loading: false })
        const result = res.result

        if (result.success) {
          wx.showModal({
            title: '发送成功',
            content: `纸条已发送给${result.data.receiverNick}，等待对方回复`,
            showCancel: false,
            success: () => {
              // 更新全局用户信息（贝壳已扣）
              this.refreshUserInfo()
              wx.navigateTo({
                url: '/pages/note/list/list?tab=sent'
              })
            }
          })
        } else {
          if (result.code === 'INFO_INCOMPLETE' || result.code === 'NO_CANDIDATE' || result.code === 'NO_SHELLS' || result.code === 'CONTENT_VIOLATION') {
            wx.showModal({
              title: '提示',
              content: result.message,
              showCancel: false
            })
          } else {
            wx.showToast({
              title: result.message || '发送失败',
              icon: 'none'
            })
          }
        }
      },
      fail: (err) => {
        this.setData({ loading: false })
        console.error('发送失败', err)
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 刷新用户信息
  refreshUserInfo() {
    const openid = app.globalData.openid
    const db = wx.cloud.database()
     
    db.collection('user').where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        // 如果全局已经有用户信息，合并数据库数据
        if (app.globalData.userInfo) {
          Object.assign(app.globalData.userInfo, user)
        } else {
          app.globalData.userInfo = user
        }
        // 确保昵称统一
        if (user.nickname && !app.globalData.userInfo.nickname) {
          app.globalData.userInfo.nickname = user.nickname
        }
        this.setData({
          userInfo: app.globalData.userInfo,
          hasUserInfo: true
        })
        this.calculateRemainingShells()
      }
    })
  },

  // 显示无贝壳弹窗
  showNoShellsDialog() {
    wx.showModal({
      title: '贝壳不足',
      content: '观看广告可以获得贝壳，继续玩哦',
      cancelText: '取消',
      confirmText: '去看广告',
      success: (res) => {
        if (res.confirm) {
          this.watchAd()
        }
      }
    })
  },

  // 去完善信息
  goToProfile() {
    wx.switchTab({
      url: '/pages/my/my'
    })
  },

  // 看广告获得贝壳
  watchAd() {
    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.callFunction({
      name: 'addTotalShells',
      data: {},
      success: (res) => {
        wx.hideLoading()
        const result = res.result
        if (result.success) {
          wx.showToast({
            title: `获得${result.added}个贝壳`,
            icon: 'success'
          })
          this.refreshUserInfo()
        } else {
          wx.showModal({
            title: '提示',
            content: result.message,
            showCancel: false
          })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({
          title: '获取失败，请重试',
          icon: 'none'
        })
      }
    })
  }
})
