// pages/note/list/list.js
const app = getApp()

Page({
  data: {
    activeTab: 'received',
    tabs: [
      { title: '我收到的', value: 'received' },
      { title: '我发出的', value: 'sent' }
    ],
    loading: false,
    notes: [],
    empty: false
  },

  onLoad(options) {
    if (options.tab) {
      this.setData({
        activeTab: options.tab
      })
    }
  },

  onShow() {
    this.loadNotes()
  },

  // 切换标签
  onTabChange(e) {
    this.setData({
      activeTab: e.detail.name
    })
    this.loadNotes()
  },

  // 加载纸条列表
  loadNotes() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getMyNotes',
      data: {
        type: this.data.activeTab
      },
      success: (res) => {
        this.setData({ loading: false })
        const result = res.result

        if (result.success) {
          const notes = result.data || []
          this.setData({
            notes,
            empty: notes.length === 0
          })
        } else {
          wx.showToast({
            title: result.message || '加载失败',
            icon: 'none'
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

  // 点击纸条项
  onNoteTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/note/detail/detail?noteId=${id}`
    })
  },

  // 格式化时间
  formatTime(date) {
    const now = new Date()
    const createTime = new Date(date)
    const diff = now.getTime() - createTime.getTime()
    
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff < minute) {
      return '刚刚'
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`
    } else {
      return `${createTime.getMonth() + 1}/${createTime.getDate()}`
    }
  },

  // 获取状态文本
  getStatusText(note, isReceived) {
    if (isReceived) {
      if (!note.is_viewed) {
        return '未查看'
      } else if (!note.is_replied) {
        return '已查看未回复'
      } else {
        return '已回复'
      }
    } else {
      if (!note.is_viewed) {
        return '对方未查看'
      } else if (!note.is_replied) {
        return '对方已查看未回复'
      } else {
        return '对方已回复'
      }
    }
  },

  // 获取摘要
  getSummary(content) {
    if (!content) return ''
    return content.length > 20 ? content.substring(0, 20) + '...' : content
  }
})
