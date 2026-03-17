// 云函数：看完广告增加一次免费生成机会
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 看一次广告增加1次
const ADD_TIMES = 1

exports.main = async (event, context) => {
  // 如果是分享奖励，使用指定的targetOpenid
  let targetOpenid = event.targetOpenid
  const { OPENID } = cloud.getWXContext()
  
  if (!targetOpenid) {
    // 不是分享奖励，使用当前调用者openid（看广告情况）
    targetOpenid = OPENID
  }

  // 分享奖励一天一个分享者只能获得一次奖励，防止刷次数
  if (event.isShareReward) {
    // 查询今天是否已经获得过奖励
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const shareCheck = await db.collection('share_rewards')
      .where({
        share_openid: targetOpenid,
        invite_openid: OPENID,
        create_time: db.command.gte(today)
      }).get()
    
    // 已经奖励过了，不再奖励
    if (shareCheck.data.length > 0) {
      return {
        success: true,
        added: 0,
        message: '今日已奖励过了'
      }
    }
    
    // 记录奖励
    await db.collection('share_rewards').add({
      data: {
        share_openid: targetOpenid,
        invite_openid: OPENID,
        create_time: new Date()
      }
    })
  }

  try {
    const userRes = await db.collection('user').where({
      _openid: targetOpenid
    }).get()

    if (userRes.data.length > 0) {
      const user = userRes.data[0]
      
      // 用户存在，增加免费次数
      // 这里total_used统计已使用次数，不存剩余次数。剩余次数 = 3 + 广告增加次数 - total_used
      // 所以只需要用户是non-vip，看广告不影响total_used，只增加可允许次数
      // 方案：给用户添加total_shells字段，默认是0，每看一次+1
      const currentAdTimes = user.total_shells || 0
      
      await db.collection('user').doc(user._id).update({
        data: {
          total_shells: currentAdTimes + ADD_TIMES
        }
      })

      return {
        success: true,
        added: ADD_TIMES,
        message: `增加${ADD_TIMES}次免费机会成功`
      }
    } else {
      return {
        success: false,
        message: '用户不存在'
      }
    }
  } catch (error) {
    console.error('增加次数失败', error)
    return {
      success: false,
      message: '增加次数失败，请重试'
    }
  }
}
