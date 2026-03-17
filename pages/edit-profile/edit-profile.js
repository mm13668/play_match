// pages/edit-profile/edit-profile.js
const app = getApp()
const Toast = require('@vant/weapp/toast/toast')

Page({
  data: {
    form: {
      nickname: '',
      gender: '',
      signature: '',
      avatar: ''
    },
    defaultAvatar: '/images/default-avatar.png',
    isSaving: false
  },

  onLoad: function () {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo: function () {
    const openid = app.getOpenid()
    if (!openid) {
      Toast.fail('请先登录')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    const db = wx.cloud.database()
    db.collection('user').where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        this.setData({
          form: {
            nickname: user.nickname || '',
            gender: user.gender || '',
            signature: user.signature || '',
            avatar: user.avatar || ''
          }
        })
      }
    }).catch(err => {
      console.error('加载用户信息失败', err)
      Toast.fail('加载用户信息失败')
    })
  },

  // 选择头像
  chooseAvatar: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadAvatar(tempFilePath)
      }
    })
  },

  // 上传头像到云存储
  uploadAvatar: function (filePath) {
    Toast.loading({
      message: '上传中...',
      forbidClick: true
    })

    const openid = app.getOpenid()
    const cloudPath = `avatars/${openid}_${Date.now()}.jpg`

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        // 获取临时链接
        wx.cloud.getTempFileURL({
          fileList: [res.fileID],
          success: (urlRes) => {
            const avatarUrl = urlRes.fileList[0].tempFileURL
            this.setData({
              'form.avatar': avatarUrl
            })
            Toast.success('上传成功')
          },
          fail: () => {
            // 使用 fileID 作为 avatar
            this.setData({
              'form.avatar': res.fileID
            })
            Toast.success('上传成功')
          }
        })
      },
      fail: (err) => {
        console.error('上传头像失败', err)
        Toast.fail('上传失败')
      }
    })
  },

  // 昵称变化
  onNicknameChange: function (e) {
    this.setData({
      'form.nickname': e.detail
    })
  },

  // 性别变化
  onGenderChange: function (e) {
    this.setData({
      'form.gender': e.detail
    })
  },

  // 签名变化
  onSignatureChange: function (e) {
    this.setData({
      'form.signature': e.detail
    })
  },

  // 验证表单
  validateForm: function () {
    const { nickname, gender } = this.data.form
    
    if (!nickname || nickname.trim() === '') {
      Toast.fail('请输入昵称')
      return false
    }
    
    if (!gender) {
      Toast.fail('请选择性别')
      return false
    }
    
    return true
  },

  // 保存
  onSave: function () {
    if (!this.validateForm()) {
      return
    }

    this.setData({ isSaving: true })

    const openid = app.getOpenid()
    const { form } = this.data

    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        openid: openid,
        avatar: form.avatar,
        nickname: form.nickname.trim(),
        gender: form.gender,
        signature: form.signature.trim()
      }
    }).then(res => {
      this.setData({ isSaving: false })
      
      if (res.result && res.result.success) {
        // 更新全局数据
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickName = form.nickname
          app.globalData.userInfo.avatarUrl = form.avatar
        }
        
        Toast.success('保存成功')
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        Toast.fail(res.result.message || '保存失败')
      }
    }).catch(err => {
      this.setData({ isSaving: false })
      console.error('保存失败', err)
      Toast.fail('保存失败')
    })
  }
})
