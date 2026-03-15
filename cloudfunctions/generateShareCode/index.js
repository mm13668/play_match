// 云函数：生成小程序分享码
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const { OPENID } = cloud.getWXContext()

exports.main = async (event, context) => {
  const { recordId } = event
  const page = 'pages/result/result'

  try {
    console.log('=== 开始生成分享码 ===')
    console.log('OPENID:', OPENID)
    console.log('recordId:', recordId)
    
    // 生成6位随机短码，足够用
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // 存储分享记录，通过短码可以找到分享者
    await db.collection('share_codes').add({
      data: {
        code: code,
        share_openid: OPENID,
        recordId: recordId,
        create_time: db.serverDate()
      }
    })

    console.log('生成短码成功:', code)
    
    // scene只放短码，长度只有6，绝对不会超出限制
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: code,
      page: page,
      width: 430,
      checkPath: false,
      isHyaline: false
    })

    console.log('=== 获取二维码成功 ===')
    
    const cloudPath = `share-codes/${Date.now()}-${code}.png`
    
    // 上传到云存储
    const upload = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: result.buffer
    })

    console.log('=== 上传成功 ===', upload.fileID)
    
    return {
      success: true,
      fileID: upload.fileID
    }
  } catch (error) {
    console.error('=== 生成分享码失败 ===')
    console.error('错误信息:', error)
    console.error('错误堆栈:', error.stack)
    return {
      success: false,
      message: '生成分享码失败',
      errorMsg: error.message || ''
    }
  }
}
