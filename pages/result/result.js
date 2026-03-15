// pages/result/result.js
const app = getApp()

Page({
  data: {
    recordId: '',
    record: null,
    isUnlocked: false,
    loading: true,
    showPoster: false,
    // canvas比例固定 2:3，尺寸根据屏幕自动计算
    canvasWidth: 500,
    canvasHeight: 750,
    qrcodeUrl: ''
  },

  onLoad: function(options) {
    if (options.recordId) {
      this.setData({
        recordId: options.recordId
      })
      // 自动计算canvas尺寸，保持 2:3 比例，间距最大化
      const sysInfo = wx.getSystemInfoSync()
      const canvasWidth = Math.min(sysInfo.windowWidth * 0.85 - 20, 500)
      const canvasHeight = canvasWidth * 1.5
      this.setData({
        canvasWidth,
        canvasHeight
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
      success: res => {
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

  // 分享给好友 - 生成海报
  onShare: function() {
    wx.showLoading({
      title: '生成海报中...'
    })

    console.log('开始生成海报', this.data.recordId)

    // 1. 调用云函数生成小程序码
    wx.cloud.callFunction({
      name: 'generateShareCode',
      data: {
        recordId: this.data.recordId
      },
      success: res => {
        console.log('云函数返回', res.result)
        if (res.result.success) {
          // 获取小程序码文件ID
          const fileID = res.result.fileID
          console.log('文件ID', fileID)
          // 获取临时路径
          wx.cloud.downloadFile({
            fileID: fileID,
            success: downloadRes => {
              console.log('下载成功', downloadRes.tempFilePath)
              this.setData({
                qrcodeUrl: downloadRes.tempFilePath
              })
              // 绘制海报
              this.drawPoster()
            },
            fail: err => {
              wx.hideLoading()
              wx.showToast({
                title: '下载小程序码失败',
                icon: 'none'
              })
              console.error('下载小程序码失败', err)
            }
          })
        } else {
          wx.hideLoading()
          const msg = res.result.errorMsg || res.result.message || '生成小程序码失败'
          wx.showToast({
            title: msg,
            icon: 'none',
            duration: 3000
          })
          console.error('云函数返回失败', res.result)
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

  // 绘制分享海报 - 按总高度百分比分配，大间距排版
  drawPoster: function() {
    try {
      const { record } = this.data
      const canvasWidth = this.data.canvasWidth
      const canvasHeight = this.data.canvasHeight

      console.log('1. 开始绘制海报', {
        person1: record.person1_name,
        person2: record.person2_name,
        score: record.match_score,
        qrcodeUrl: this.data.qrcodeUrl
      })

      console.log('2. 创建canvas context')
      const ctx = wx.createCanvasContext('posterCanvas')
      console.log('3. context创建成功', ctx)

      // 1. 背景白色铺满整个canvas
      ctx.setFillStyle('#ffffff')
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // 重新分配整个画布空间百分比：
      // [头部 20%] - [分数 25%] - [文案 20%] - [二维码 30%] - [底部 5%]

      // ===== 1. 顶部粉色标题栏 占总高度 20% =====
      const headerHeight = canvasHeight * 0.20
      ctx.setFillStyle('#FF6B6B')
      ctx.fillRect(0, 0, canvasWidth, headerHeight)

      // 标题文字 - 垂直居中
      ctx.setFillStyle('#ffffff')
      ctx.setFontSize(Math.max(28, canvasWidth / 500 * 28))
      ctx.setTextAlign('center')
      ctx.fillText('去玩匹配', canvasWidth / 2, headerHeight * 0.4)

      // 两个人姓名 - 在标题栏下半部分
      ctx.setFontSize(Math.max(24, canvasWidth / 500 * 24))
      ctx.fillText(`${record.person1_name} & ${record.person2_name}`, canvasWidth / 2, headerHeight * 0.8)

      console.log('4. 标题姓名绘制完成')

      // ===== 2. 分数区域 占总高度 25% 从 headerHeight 开始 =====
      // 大分数
      const scoreStartY = headerHeight
      ctx.setFillStyle('#333333')
      ctx.setFontSize(canvasWidth * 0.18)
      ctx.setTextAlign('center')
      ctx.fillText(record.match_score, canvasWidth / 2, scoreStartY + canvasHeight * 0.12)

      // "匹配得分"文字
      ctx.setFontSize(Math.max(20, canvasWidth / 500 * 20))
      ctx.fillText('匹配得分', canvasWidth / 2, scoreStartY + canvasHeight * 0.20)

      console.log('5. 分数绘制完成')

      // ===== 3. 文案区域 占总高度 20% =====
      const textStartY = headerHeight + canvasHeight * 0.25
      // 结论短句
      ctx.setFontSize(Math.max(26, canvasWidth / 500 * 26))
      ctx.setFillStyle('#FF6B6B')
      ctx.fillText(record.short_result, canvasWidth / 2, textStartY + canvasHeight * 0.08)

      // 提示文案
      ctx.setFillStyle('#666666')
      ctx.setFontSize(Math.max(18, canvasWidth / 500 * 18))
      ctx.fillText('扫码查看完整分析报告', canvasWidth / 2, textStartY + canvasHeight * 0.16)

      console.log('6. 文案绘制完成')

      // ===== 4. 二维码区域 占总高度 30% =====
      const qrcodeStartY = headerHeight + canvasHeight * 0.45
      const qrcodeSize = Math.min(canvasWidth * 0.5, canvasHeight * 0.28)
      const qrcodeX = (canvasWidth - qrcodeSize) / 2
      ctx.drawImage(this.data.qrcodeUrl, qrcodeX, qrcodeStartY + canvasHeight * 0.02, qrcodeSize, qrcodeSize)

      // 5. 底部提示 占总高度 5% =====
      ctx.setFillStyle('#999999')
      ctx.setFontSize(Math.max(16, canvasWidth / 500 * 16))
      ctx.fillText('长按识别小程序码，快来测试吧', canvasWidth / 2, qrcodeStartY + qrcodeSize + canvasHeight * 0.04)

      console.log('7. 二维码绘制完成')

      ctx.draw()
      console.log('8. ctx.draw 调用完成')

      // 延迟显示弹窗
      setTimeout(() => {
        try {
          console.log('9. 显示弹窗')
          wx.hideLoading()
          this.setData({
            showPoster: true
          })
          console.log('10. 海报绘制完成')
        } catch (drawErr) {
          console.error('绘制完成回调异常', drawErr)
          wx.hideLoading()
        }
      }, 100)
    } catch (err) {
      console.error('顶级捕获异常', err)
      wx.hideLoading()
      wx.showToast({
        title: '绘制海报失败',
        icon: 'none'
      })
      console.error('绘制海报异常', err)
    }
  },

  // 关闭海报弹窗
  onClosePoster: function() {
    this.setData({
      showPoster: false
    })
  },

  // 保存海报到相册
  onSavePoster: function() {
    wx.canvasToTempFilePath({
      canvasId: 'posterCanvas',
      width: this.data.canvasWidth,
      height: this.data.canvasHeight,
      destWidth: this.data.canvasWidth * 2,
      destHeight: this.data.canvasHeight * 2,
      success: res => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            })
            this.setData({
              showPoster: false
            })
          },
          fail: err => {
            if (err.errMsg.includes('auth')) {
              wx.showModal({
                title: '提示',
                content: '需要授权才能保存到相册',
                success: modalRes => {
                  if (modalRes.confirm) {
                    wx.openSetting()
                  }
                }
              })
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              })
            }
          }
        })
      },
      fail: err => {
        wx.showToast({
          title: '生成图片失败',
          icon: 'none'
        })
        console.error('canvasToTempFilePath failed', err)
      }
    })
  },

  onShareAppMessage: function() {
    return {
      title: '来测一测我们的匹配度吧！',
      path: '/pages/index/index'
    }
  }
})
