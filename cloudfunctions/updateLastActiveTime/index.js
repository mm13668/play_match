// 云函数：更新用户最近活跃时间
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取用户信息
    const userRes = await db.collection('user').where({
      _openid: OPENID
    }).get()

    if (userRes.data.length === 0) {
      // 用户不存在，不需要更新
      return {
        success: true,
        updated: false,
        message: '用户不存在'
      }
    }

    const user = userRes.data[0]

    // 更新最近活跃时间为当前时间
    await db.collection('user').doc(user._id).update({
      data: {
        last_active_time: new Date()
      }
    })

    return {
      success: true,
      updated: true,
      message: '更新成功'
    }

  } catch (error) {
    console.error('更新活跃时间失败', error)
    return {
      success: false,
      message: '更新失败'
    }
  }
}
