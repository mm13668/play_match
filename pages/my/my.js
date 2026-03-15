// pages/my/my.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    totalTests: 0,
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
      this.saveUserInfo(userInfo)
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
     // 获取本地缓存次数，新用户要同步已经用掉的次数
     let localRemaining = wx.getStorageSync('local_free_times')
     if (!localRemaining && localRemaining !== 0) {
       // 如果 isNaN(localRemaining)，重置为 3
       localRemaining = 3
     }
     const usedTimes = 3 - localRemaining
     
     db.collection('user').where({
       _openid: openid
     }).get().then(res => {
       if (res.data.length === 0) {
         // 新用户，同步本地已经使用掉的次数到云端
         db.collection('user').add({
           data: {
             _openid: openid,
             nickname: userInfo.nickName,
             avatar: userInfo.avatarUrl,
             create_time: db.serverDate(),
             total_tests: usedTimes,
             ad_free_times: 0
           }
         })
         // 授权后缓存已经和云端同步了，本地剩余 = 本地缓存 - usedTimes = 本地剩余
         let localFreeTimes = localRemaining - usedTimes
         if(localFreeTimes < 0 ){
          localFreeTimes = 0
         }
         wx.setStorageSync('local_free_times', localFreeTimes)
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
          totalTests: user.total_tests || 0
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
