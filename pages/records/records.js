// pages/records/records.js
const app = getApp()

Page({
  data: {
    allRecords: [],
    loading: true
  },

  onLoad: function () {
    this.loadAllRecords()
  },

  onShow: function () {
    this.loadAllRecords()
  },

  // 加载所有测试记录
  loadAllRecords: function () {
    this.setData({ loading: true })
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
          allRecords: res.data,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载记录失败', err)
        this.setData({ loading: false })
      })
  },

  // 点击记录查看详情
  onRecordTap: function (e) {
    const recordId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/result/result?recordId=${recordId}`
    })
  }
})
