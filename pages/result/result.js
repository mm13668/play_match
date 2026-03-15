// pages/result/result.js
const app = getApp()

Page({
  data: {
    recordId: '',
    record: null,
    isUnlocked: false,
    loading: true
  },

  onLoad: function(options) {
    if (options.recordId) {
      this.setData({
        recordId: options.recordId
      })
      this.loadRecord()
    } else {
      wx.navigateBack()
    }
  },

  // 加载测试记录
  loadRecord: function() {
    const db = wx.cloud.database()
    db.collection('test_record')
      .doc(this.data.recordId)
      .get()
      .then(res => {
        const record = res.data
        this.setData({
          record,
          isUnlocked: record.is_unlocked,
          loading: false
        })
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        console.error('加载记录失败', err)
      })
  },

  // 点击解锁完整报告
  onUnlock: function() {
    wx.showActionSheet({
      itemList: ['看广告解锁', '付费解锁（0.99元）'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.unlockByAd()
        } else {
          this.unlockByPay()
        }
      }
    })
  },

  // 广告解锁
  unlockByAd: function() {
    // 后续开发激励视频广告
    wx.showToast({
      title: '广告功能开发中',
      icon: 'none'
    })
  },

  // 付费解锁
  unlockByPay: function() {
    wx.showLoading({
      title: '创建订单...'
    })
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        recordId: this.data.recordId,
        productType: 'single_unlock'
      },
      success: res => {
        wx.hideLoading()
        if (res.result.success) {
          wx.requestPayment({
            ...res.result.payment,
            success: () => {
              this.setData({
                isUnlocked: true
              })
              wx.showToast({
                title: '解锁成功'
              })
            },
            fail: err => {
              console.error('支付失败', err)
            }
          })
        } else {
          wx.showToast({
            title: res.result.message || '创建订单失败',
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
  },

  // 再测一次
  onRetest: function() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 分享给好友
  onShare: function() {
    // 后续开发分享海报
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
  },

  onShareAppMessage: function() {
    return {
      title: '来测一测我们的匹配度吧！',
      path: '/pages/index/index'
    }
  }
})
