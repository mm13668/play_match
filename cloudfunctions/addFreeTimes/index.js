// 云函数：看完广告增加一次免费生成机会
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 看一次广告增加1次
const ADD_TIMES = 1

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const userRes = await db.collection('user').where({
      _openid: OPENID
    }).get()

    if (userRes.data.length > 0) {
      const user = userRes.data[0]
      
      // 用户存在，增加免费次数
      // 这里total_tests统计已使用次数，不存剩余次数。剩余次数 = 3 + 广告增加次数 - total_tests
      // 所以只需要用户是non-vip，看广告不影响total_tests，只增加可允许次数
      // 方案：给用户添加ad_free_times字段，默认是0，每看一次+1
      const currentAdTimes = user.ad_free_times || 0
      
      await db.collection('user').doc(user._id).update({
        data: {
          ad_free_times: currentAdTimes + ADD_TIMES
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
