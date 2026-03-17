// pages/index/index.js
const app = getApp()

Page({
  data: {
    person1Name: '',
    person2Name: '',
    relationType: '1',
    historyRecords: [],
    remainingShells: 3,
    hasUserInfo: false
  },

  onLoad: function (options) {
    // 检查是否从分享海报进来，如果是则给分享者增加次数
    // 使用短码方式，scene只放6位短码，查询数据库获取分享者openid
    const shareCode = options.scene || options[0]
    if (shareCode && shareCode.length === 6) {
      // 通过短码查询分享者openid
      this.getShareOpenidByCode(shareCode)
    }
    this.loadUserInfo()
    this.loadHistoryRecords()
  },

  onShow: function () {
    this.loadUserInfo()
    this.loadHistoryRecords()
  },

  // 加载用户信息获取已测试次数
  loadUserInfo: function() {
    const openid = app.getOpenid() || wx.getStorageSync('openid')
    console.log("openid",openid)
    if (!openid) {
      // 未授权登录，从缓存读取次数
      let cached = wx.getStorageSync('local_free_times')
      if (cached === '' || cached === null || typeof cached === 'undefined') {
        cached = 3
      }
      // 保证cached是数字
      cached = Number(cached)
      this.setData({
        remainingShells: cached,
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
        const remaining = Math.max(0, user.total_shells - user.total_used)
        this.setData({
          remainingShells: remaining,
          hasUserInfo: true
        })
        wx.setStorageSync('local_free_times', remaining)
        wx.setStorageSync('openid', openid)
      } else {
        this.setData({
          remainingShells: 3,
          hasUserInfo: true
        })
        wx.setStorageSync('local_free_times', 3)
      }
  }).catch(err => {
        console.error('加载用户信息失败', err)
        this.setData({
          remainingShells: 3
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

  // 点击选择关系类型
  selectRelation: function(e) {
    this.setData({
      relationType: e.currentTarget.dataset.value
    })
  },

  // 开始测试
  onStartTest: function() {
    const { person1Name, person2Name, remainingShells } = this.data

    if (!person1Name || !person2Name) {
      wx.showToast({
        title: '请填写两个人的姓名',
        icon: 'none'
      })
      return
    }

    // 本地检查次数，如果没次数直接提示
    if (remainingShells <= 0) {
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


    console.log("relationType",this.data.relationType )

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
          const newRemaining = Math.max(0, this.data.remainingShells - 1)
          this.setData({
            remainingShells: newRemaining
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

  // 跳转到我的测试记录页面看所有记录
  onGoMy: function() {
    wx.navigateTo({
      url: '/pages/records/records'
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
   },

   // 通过短码查询分享者openid
   getShareOpenidByCode: function(code) {
     const currentOpenid = app.getOpenid() || wx.getStorageSync('openid')
     if (!currentOpenid) {
       // 当前用户未登录，不处理奖励
       return
     }
     
     const db = wx.cloud.database()
     db.collection('share_codes')
       .where({
         code: code
       })
       .get()
       .then(res => {
         if (res.data.length > 0) {
           const shareInfo = res.data[0]
           const shareOpenid = shareInfo.share_openid
           
           // 不能给自己增加，分享者自己点击不算
           if (currentOpenid !== shareOpenid) {
             this.handleShareInvite(shareOpenid)
           }
         }
       })
       .catch(err => {
         console.error('查询分享码失败', err)
       })
   },

   // 处理分享邀请：好友通过分享进入，给分享者增加一次免费机会
   handleShareInvite: function(shareOpenid) {
     // 调用云函数给分享者增加一次免费机会
     wx.cloud.callFunction({
       name: 'addFreeTimes',
       data: {
         targetOpenid: shareOpenid,
         isShareReward: true
       },
       success: res => {
         console.log('分享奖励发放成功', res.result)
         wx.showToast({
           title: '感谢支持分享者，已发放奖励',
           icon: 'success',
           duration: 2000
         })
       },
       fail: err => {
         console.error('分享奖励发放失败', err)
       }
     })
   }
 })

