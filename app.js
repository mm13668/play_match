App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-6g7xiq0y54b422bc', // 请替换为你的云开发环境ID
        traceUser: true
      })
    }

    this.globalData = {
      openid: null,
      userInfo: null
    }
  },

  setEnvId: function(envId) {
    this.cloud.envId = envId
  },

  getOpenid: function() {
    return this.globalData.openid
  },

  setOpenid: function(openid) {
    this.globalData.openid = openid
  }
})
