// pages/index/index.js
const app = getApp()

Page({
  data: {
    person1Name: '',
    person2Name: '',
    relationType: '1',
    historyRecords: [],
    remainingTimes: 3,
    hasUserInfo: false
  },

  onLoad: function () {
    this.loadUserInfo()
    this.loadHistoryRecords()
  },

  onShow: function () {
    this.loadUserInfo()
    this.loadHistoryRecords()
  },

  // 加载用户信息获取已测试次数
  loadUserInfo: function() {
    const openid = app.getOpenid()
    if (!openid) {
      // 未授权登录，从缓存读取次数
      let cached = wx.getStorageSync('local_free_times')
      if (cached === '' || cached === null || typeof cached === 'undefined') {
        cached = 3
      }
      // 保证cached是数字
      cached = Number(cached)
      this.setData({
        remainingTimes: cached,
        hasUserInfo: false
      })
      return
    }

    const db = wx.cloud.database()
    db.collection('user').where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        const total = user.total_tests || 0
        const adFreeTimes = user.ad_free_times || 0
        const totalAllowed = 3 + adFreeTimes
        const remaining = Math.max(0, totalAllowed - total)
        this.setData({
          remainingTimes: remaining,
          hasUserInfo: true
        })
        wx.setStorageSync('local_free_times', remaining)
      } else {
        this.setData({
          remainingTimes: 3,
          hasUserInfo: true
        })
        wx.setStorageSync('local_free_times', 3)
      }
  }).catch(err => {
        console.error('加载用户信息失败', err)
        this.setData({
          remainingTimes: 3
        })
      })
  },

  // 输入框变化
  onPerson1Input: function(e) {
    this.setData({
      person1Name: e.detail.trim()
    })
  },

  onPerson2Input: function(e) {
    this.setData({
      person2Name: e.detail.trim()
    })
  },

  onRelationChange: function(e) {
    this.setData({
      relationType: e.detail.value
    })
  },

  // 开始测试
  onStartTest: function() {
    const { person1Name, person2Name, remainingTimes } = this.data

    if (!person1Name || !person2Name) {
      wx.showToast({
        title: '请填写两个人的姓名',
        icon: 'none'
      })
      return
    }

    // 本地检查次数，如果没次数直接提示
    if (remainingTimes <= 0) {
      wx.showModal({
        title: '免费次数已用完',
        content: '观看广告可以获得更多免费生成机会，快去点击看广告获取吧',
        confirmText: '去看广告',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.onWatchAd()
          }
        }
      })
      return
    }

    wx.showLoading({
      title: 'AI匹配中...',
      mask: true
    })

    wx.cloud.callFunction({
      name: 'generateReport',
      data: {
        person1_name: person1Name,
        person2_name: person2Name,
        relation_type: this.data.relationType
      },
      success: res => {
        wx.hideLoading()
        if (res.result.success) {
          // 成功生成后，本地扣减一次
          const newRemaining = Math.max(0, this.data.remainingTimes - 1)
          this.setData({
            remainingTimes: newRemaining
          })
          wx.setStorageSync('local_free_times', newRemaining)
          wx.navigateTo({
            url: `/pages/result/result?recordId=${res.result.recordId}`
          })
        } else {
          if (res.result.code === 'LIMIT_EXCEEDED') {
            wx.showModal({
              title: '免费次数已用完',
              content: '观看广告可以获得更多免费生成机会，快去点击看广告获取吧',
              confirmText: '看广告',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this.onWatchAd()
                }
              }
            })
          } else {
            wx.showToast({
              title: res.result.message || '生成失败，请重试',
              icon: 'none'
            })
          }
        }
      },
      fail: err => {
        wx.hideLoading()
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
        console.error('调用云函数失败', err)
      }
    })
  },

  // 加载历史记录
  loadHistoryRecords: function() {
    const openid = app.getOpenid()
    if (!openid) {
      return
    }

    const db = wx.cloud.database()
    db.collection('test_record')
      .where({
        user_openid: openid
      })
      .orderBy('create_time', 'desc')
      .limit(3)
      .get()
      .then(res => {
        this.setData({
          historyRecords: res.data
        })
      })
      .catch(err => {
        console.error('加载历史记录失败', err)
      })
  },

  // 点击历史记录
  onHistoryTap: function(e) {
    const recordId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/result/result?recordId=${recordId}`
    })
  },

  // 跳转到我的页面看所有记录
  onGoMy: function() {
    wx.switchTab({
      url: '/pages/my/my'
    })
  },

  // 看广告增加免费次数
  onWatchAd: function() {
    // 这里后续接入流量主激励视频广告
    // 目前先占位，广告看完调用云函数增加次数
    wx.showModal({
      title: '看广告得次数',
      content: '观看激励视频广告后可获得1次免费生成机会，确定继续吗？',
      confirmText: '观看广告',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 模拟广告看完，调用云函数
          wx.showLoading({
            title: '处理中...'
          })
          wx.cloud.callFunction({
            name: 'addFreeTimes',
            success: res => {
              wx.hideLoading()
              if (res.result.success) {
                wx.showToast({
                  title: res.result.message,
                  icon: 'success'
                })
                this.loadUserInfo()
              } else {
                wx.showToast({
                  title: res.result.message || '操作失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              wx.hideLoading()
              wx.showToast({
                title: '网络错误',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  }
})
