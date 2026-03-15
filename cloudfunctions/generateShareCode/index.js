// 云函数：生成小程序分享码
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { recordId } = event
  const page = `pages/result/result?recordId=${recordId}`

  try {
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: `recordId=${recordId}`,
      page: page,
      width: 430
    })

    // 上传到云存储
    const upload = await cloud.uploadFile({
      cloudPath: `share-codes/${Date.now()}-${Math.random()}.png`,
      fileContent: result.buffer
    })

    return {
      success: true,
      fileID: upload.fileID
    }
  } catch (error) {
    console.error('生成分享码失败', error)
    return {
      success: false,
      message: '生成分享码失败'
    }
  }
}
