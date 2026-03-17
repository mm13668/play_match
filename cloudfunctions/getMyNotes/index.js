// 云函数：获取我的纸条列表（我发出的 / 我收到的）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { type } = event // type: 'sent' 我发出的, 'received' 我收到的

  try {
    let query = {}
    
    if (type === 'sent') {
      query.sender_openid = OPENID
    } else if (type === 'received') {
      query.receiver_openid = OPENID
    } else {
      return {
        success: false,
        message: '参数错误'
      }
    }

    // 查询并按创建时间倒序排列
    const result = await db.collection('notes')
      .where(query)
      .orderBy('create_time', 'desc')
      .get()

    return {
      success: true,
      data: result.data,
      message: '获取成功'
    }

  } catch (error) {
    console.error('获取纸条列表失败', error)
    return {
      success: false,
      message: '获取纸条列表失败，请重试'
    }
  }
}
