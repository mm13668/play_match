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
      // 重新从全局获取用户信息，更新页面展示
      const userInfo = app.globalData.userInfo
      if (userInfo) {
        this.setData({
          userInfo
        })
      }
      this.loadUserData()
      this.loadAllRecordsCount()
    }
  },

  // 检查登录状态
  checkLogin: function () {
    const userInfo = app.globalData.userInfo
    // 先从本地缓存读取openid
    const cachedOpenid = wx.getStorageSync('openid')
    if (cachedOpenid) {
      app.setOpenid(cachedOpenid)
    }
    
    // 如果已经有openid，无论是否有用户信息，都展示内容
    if (cachedOpenid) {
      if (userInfo) {
        this.setData({
          userInfo,
          hasUserInfo: true
        })
      } else {
        // 有openid但没有用户信息，设置一个默认展示
        this.setData({
          hasUserInfo: true
        })
      }
      this.loadUserData()
      this.loadAllRecordsCount()
    } else if (userInfo && !cachedOpenid) {
      // 如果有用户信息但没有openid，重新调用云函数获取
      this.setData({
        userInfo,
        hasUserInfo: true
      })
      this.getOpenIdFromCloud()
    }
    // 没有openid也没有用户信息，才显示授权按钮
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

      console.log("userInfo",userInfo)
      
      // 调用云函数获取openid
      this.getOpenIdFromCloud()
    }
  },
  
   // 调用云函数获取openid
   getOpenIdFromCloud: function () {
     wx.cloud.callFunction({
       name: 'getOpenId',
       success: res => {
         console.log('[getOpenId] 云函数调用成功', res)
         const { openid, appid, unionid } = res.result
         // 保存到全局变量
         app.setOpenid(openid)
         // 保存到本地缓存
         wx.setStorageSync('openid', openid)
         console.log('获取openid成功', openid)
         
         // 确保页面显示用户信息而不是授权按钮
         this.setData({
           hasUserInfo: true
         })
         
         // 保存到数据库
         this.saveUserInfo(this.data.userInfo)
         this.loadUserData()
         this.loadAllRecordsCount()
       },
      fail: err => {
        console.error('[getOpenId] 云函数调用失败', err)
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
      }
    })
  },

   // 保存用户信息到数据库
   saveUserInfo: function (userInfo) {
     const openid = app.getOpenid()
     const db = wx.cloud.database()
     console.log("openid",openid)
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
        
        // 如果有昵称和头像从数据库，更新到页面和全局
        if (user.nickname || user.avatar) {
          // 更新全局数据
          if (app.globalData.userInfo) {
            if (user.nickname) {
              app.globalData.userInfo.nickName = user.nickname
              app.globalData.userInfo.nickname = user.nickname
            }
            if (user.avatar) {
              app.globalData.userInfo.avatar = user.avatar
              app.globalData.userInfo.avatarUrl = user.avatar
            }
          }
          
          // 直接更新页面数据，确保显示最新
          const updateData = {}
          if (user.nickname) {
            updateData['userInfo.nickName'] = user.nickname
            updateData['userInfo.nickname'] = user.nickname
          }
          if (user.avatar) {
            updateData['userInfo.avatar'] = user.avatar
            updateData['userInfo.avatarUrl'] = user.avatar
          }
          this.setData(updateData)
        }
      }
    })
  },

  // 加载测试记录数量（用于菜单显示）
  loadAllRecordsCount: function () {
    const openid = app.getOpenid()
    const db = wx.cloud.database()

    db.collection('test_record')
      .where({
        user_openid: openid
      })
      .get()
      .then(res => {
        this.setData({
          allRecords: res.data
        })
      })
  },

   // 跳转到我的测试记录页面
   goToRecords: function () {
     wx.navigateTo({
       url: '/pages/records/records'
     })
   },

   // 跳转到编辑资料页面
   goToEditProfile: function () {
     if (!this.data.hasUserInfo) {
       wx.showToast({
         title: '请先登录',
         icon: 'none'
       })
       return
     }
     wx.navigateTo({
       url: '/pages/edit-profile/edit-profile'
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
   },

   // 退出登录
   onLogout: function () {
     wx.showModal({
       title: '确认退出',
       content: '确定要退出登录吗？',
       success: (res) => {
         if (res.confirm) {
           // 清除本地缓存的openid
           wx.removeStorageSync('openid')
           // 清除全局的openid和userInfo
           app.setOpenid(null)
           app.globalData.userInfo = null
           // 重置页面状态
           this.setData({
             userInfo: null,
             hasUserInfo: false,
             totalTests: 0,
             allRecords: []
           })
           wx.showToast({
             title: '退出成功',
             icon: 'success'
           })
         }
       }
     })
   }
 })
