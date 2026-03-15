// pages/my/my.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    totalTests: 0,
    isVip: false,
    vipExpireText: '',
    allRecords: []
  },

  onLoad: function () {
    this.checkLogin()
  },

  onShow: function () {
    if (this.data.hasUserInfo) {
      this.loadUserData()
      this.loadAllRecords()
    }
  },

  // 检查登录状态
  checkLogin: function () {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        userInfo,
        hasUserInfo: true
      })
      this.loadUserData()
      this.loadAllRecords()
    }
  },

  // 获取用户信息
  onGetUserInfo: function (e) {
    if (e.detail.userInfo) {
      const userInfo = e.detail.userInfo
      this.setData({
        userInfo,
        hasUserInfo: true
      })
      app.globalData.userInfo = userInfo

      // 保存到数据库
      this.saveUserInfo(userInfo)
      this.loadUserData()
      this.loadAllRecords()
    }
  },

  // 保存用户信息到数据库
  saveUserInfo: function (userInfo) {
    const openid = app.getOpenid()
    const db = wx.cloud.database()

    db.collection('user').where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length === 0) {
        // 新用户
        db.collection('user').add({
          data: {
            nickname: userInfo.nickName,
            avatar: userInfo.avatarUrl,
            create_time: db.serverDate(),
            total_tests: 0,
            is_vip: false,
            vip_expire_time: null
          }
        })
      }
    })
  },

  // 加载用户数据
  loadUserData: function () {
    const openid = app.getOpenid()
    const db = wx.cloud.database()

    db.collection('user').where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        this.setData({
          totalTests: user.total_tests || 0,
          isVip: user.is_vip || false
        })
      }
    })
  },

  // 加载所有测试记录
  loadAllRecords: function () {
    const openid = app.getOpenid()
    const db = wx.cloud.database()

    db.collection('test_record')
      .where({
        user_openid: openid
      })
      .orderBy('create_time', 'desc')
      .get()
      .then(res => {
        this.setData({
          allRecords: res.data
        })
      })
  },

  // 点击记录查看详情
  onRecordTap: function (e) {
    const recordId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/result/result?recordId=${recordId}`
    })
  },

  // 开通会员
  onOpenVip: function () {
    wx.showToast({
      title: '会员功能开发中',
      icon: 'none'
    })
  },

  // 设置
  onSettings: function () {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    })
  },

  // 关于我们
  onAbout: function () {
    wx.showModal({
      title: '去玩匹配',
      content: 'AI驱动的双人关系匹配测试\n用AI分析你们的默契指数',
      showCancel: false
    })
  }
})
