// pages/note/detail/detail.js
const app = getApp()

Page({
  data: {
    noteId: '',
    loading: true,
    note: null,
    isReceiver: false,
    canReply: false,
    showReplyInput: false,
    replyContent: '',
    maxLength: 200,
    remainingCount: 200,
    replying: false,
    generatingMatch: false,
    remainingShells: 0,
    bubbles: []
  },

  // 生成随机气泡装饰
  generateRandomBubbles() {
    const bubbles = []
    // 生成20-30个随机气泡
    const count = 20 + Math.floor(Math.random() * 11)
    
    for (let i = 0; i < count; i++) {
      const size = 30 + Math.floor(Math.random() * 80)
      const left = Math.random() * 100
      const bottom = Math.random() * 100
      const opacity = 0.2 + Math.random() * 0.3
      const duration = 3 + Math.random() * 4
      const delay = Math.random() * 3
      
      bubbles.push({
        style: `
          width: ${size}rpx;
          height: ${size}rpx;
          left: ${left}%;
          bottom: ${bottom}%;
          opacity: ${opacity};
          animation-duration: ${duration}s;
          animation-delay: -${delay}s;
        `.replace(/\s+/g, ' ').trim()
      })
    }
    
    this.setData({ bubbles })
  },

  onLoad(options) {
    this.generateRandomBubbles()
    if (options.noteId) {
      this.setData({
        noteId: options.noteId
      })
      this.loadDetail()
    }
  },

  onShow() {
    this.calculateRemainingShells()
  },

  // 加载详情
  loadDetail() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getNoteDetail',
      data: {
        noteId: this.data.noteId
      },
      success: (res) => {
        this.setData({ loading: false })
        const result = res.result

          if (result.success) {
            let note = JSON.parse(JSON.stringify(result.data))
            const openid = app.globalData.openid
            const isReceiver = note.receiver_openid === openid
            const canReply = isReceiver && note.is_viewed && !note.is_replied
            
            // 预先格式化时间，直接显示
            if (note.create_time) {
              let timestamp
              if (typeof note.create_time === 'object' && note.create_time.$date) {
                timestamp = note.create_time.$date
              } else if (typeof note.create_time === 'number') {
                timestamp = note.create_time
              } else if (typeof note.create_time === 'string') {
                timestamp = Date.parse(note.create_time)
              }
              
              if (timestamp) {
                const d = new Date(timestamp)
                const month = d.getMonth() + 1
                const day = d.getDate()
                const hours = d.getHours()
                const minutes = d.getMinutes()
                const monthStr = month < 10 ? '0' + month : '' + month
                const dayStr = day < 10 ? '0' + day : '' + day
                const hoursStr = hours < 10 ? '0' + hours : '' + hours
                const minutesStr = minutes < 10 ? '0' + minutes : '' + minutes
                note.create_time_formatted = `${d.getFullYear()}-${monthStr}-${dayStr} ${hoursStr}:${minutesStr}`
              } else {
                note.create_time_formatted = ''
              }
            }
            
            if (note.reply_time) {
              let timestamp
              if (typeof note.reply_time === 'object' && note.reply_time.$date) {
                timestamp = note.reply_time.$date
              } else if (typeof note.reply_time === 'number') {
                timestamp = note.reply_time
              } else if (typeof note.reply_time === 'string') {
                timestamp = Date.parse(note.reply_time)
              }
              
              if (timestamp) {
                const d = new Date(timestamp)
                const month = d.getMonth() + 1
                const day = d.getDate()
                const hours = d.getHours()
                const minutes = d.getMinutes()
                const monthStr = month < 10 ? '0' + month : '' + month
                const dayStr = day < 10 ? '0' + day : '' + day
                const hoursStr = hours < 10 ? '0' + hours : '' + hours
                const minutesStr = minutes < 10 ? '0' + minutes : '' + minutes
                note.reply_time_formatted = `${d.getFullYear()}-${monthStr}-${dayStr} ${hoursStr}:${minutesStr}`
              } else {
                note.reply_time_formatted = ''
              }
            }

            this.setData({
              note,
              isReceiver,
              canReply
            })
          }
       },
      fail: (err) => {
        this.setData({ loading: false })
        console.error('加载失败', err)
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 计算剩余贝壳
  calculateRemainingShells() {
    if (!app.globalData.userInfo) return
    
    const { total_shells = 0, total_used = 0 } = app.globalData.userInfo
    const remaining = Math.max(0, 3 + total_shells - total_used)
    this.setData({
      remainingShells: remaining
    })
  },

  // 显示回复框
  onShowReply() {
    this.setData({
      showReplyInput: true
    })
  },

  // 取消回复
  onCancelReply() {
    this.setData({
      showReplyInput: false,
      replyContent: ''
    })
  },

  // 回复内容变化
  onReplyInput(e) {
    const content = e.detail.value
    const remainingCount = this.data.maxLength - content.length
    this.setData({
      replyContent: content,
      remainingCount
    })
  },

  // 提交回复
  onSubmitReply() {
    const { replyContent } = this.data

    if (!replyContent.trim()) {
      wx.showToast({
        title: '请输入回复内容',
        icon: 'none'
      })
      return
    }

    if (replyContent.length > this.data.maxLength) {
      wx.showToast({
        title: `内容不能超过${this.data.maxLength}字`,
        icon: 'none'
      })
      return
    }

    this.setData({ replying: true })

    wx.cloud.callFunction({
      name: 'replyNote',
      data: {
        noteId: this.data.noteId,
        replyContent: replyContent.trim()
      },
      success: (res) => {
        this.setData({ replying: false })
        const result = res.result

        if (result.success) {
          wx.showToast({
            title: '回复成功',
            icon: 'success'
          })
          this.setData({
            'note.is_replied': true,
            'note.reply_content': replyContent,
            showReplyInput: false
          })
          this.loadDetail()
        } else {
          if (result.code === 'CONTENT_VIOLATION') {
            wx.showModal({
              title: '提示',
              content: result.message,
              showCancel: false
            })
          } else {
            wx.showToast({
              title: result.message || '回复失败',
              icon: 'none'
            })
          }
        }
      },
      fail: () => {
        this.setData({ replying: false })
        wx.showToast({
          title: '回复失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 生成情侣匹配报告
  onGenerateMatch() {
    if (this.data.remainingShells < 1) {
      this.showNoShellsDialog()
      return
    }

    this.setData({ generatingMatch: true })

    wx.cloud.callFunction({
      name: 'generateMatchFromNote',
      data: {
        noteId: this.data.noteId
      },
      success: (res) => {
        this.setData({ generatingMatch: false })
        const result = res.result

        if (result.success) {
          wx.showToast({
            title: '生成成功',
            icon: 'success'
          })
          // 刷新用户信息
          this.refreshUserInfo()
          // 跳转到结果页
          wx.redirectTo({
            url: `/pages/result/result?id=${result.data.reportId}`
          })
        } else {
          if (result.code === 'NO_SHELLS') {
            this.showNoShellsDialog()
          } else {
            wx.showModal({
              title: '提示',
              content: result.message,
              showCancel: false
            })
          }
        }
      },
      fail: () => {
        this.setData({ generatingMatch: false })
        wx.showToast({
          title: '生成失败，请重试',
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
        app.globalData.userInfo = res.data[0]
        this.calculateRemainingShells()
      }
    })
  },

  // 显示无贝壳弹窗
  showNoShellsDialog(callback) {
    wx.showModal({
      title: '贝壳不足',
      content: '观看广告可以获得贝壳，继续玩哦',
      cancelText: '取消',
      confirmText: '去看广告',
      success: (res) => {
        if (res.confirm) {
          this.watchAd()
        } else if (callback) {
          callback()
        }
      }
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
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return ''
    
    // 处理各种可能的日期格式
    let timestamp
    
    if (typeof date === 'object' && date !== null && date.$date) {
      // 云开发 serverDate 格式
      timestamp = date.$date
    } else if (typeof date === 'number') {
      // 时间戳
      timestamp = date
    } else if (typeof date === 'string') {
      // 尝试转换为时间戳
      timestamp = Date.parse(date)
    } else {
      return ''
    }
    
    const d = new Date(timestamp)
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      return ''
    }
    
    // 兼容处理：手动补零，不使用 padStart 避免兼容性问题
    const month = d.getMonth() + 1
    const day = d.getDate()
    const monthStr = month < 10 ? '0' + month : '' + month
    const dayStr = day < 10 ? '0' + day : '' + day
    
    return `${d.getFullYear()}-${monthStr}-${dayStr}`
  },

  // 获取性别文本
  getGenderText(gender) {
    return gender === 'male' ? '男' : '女'
  }
})
