// 云函数：获取纸条详情，处理查看权限（扣贝壳）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 计算剩余贝壳数量
const getRemainingShells = (user) => {
  const totalShells = user.total_shells || 0
  const totalUsed = user.total_used || 0
  return Math.max(0, 3 + totalShells - totalUsed)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { noteId } = event

  try {
    // 1. 获取纸条信息
    const noteRes = await db.collection('notes').doc(noteId).get()
    if (!noteRes.data) {
      return {
        success: false,
        message: '纸条不存在'
      }
    }

    const note = noteRes.data

    // 2. 权限检查：只能是发送者或接收者才能查看
    if (note.sender_openid !== OPENID && note.receiver_openid !== OPENID) {
      return {
        success: false,
        message: '无权限查看此纸条'
      }
    }

    // 3. 如果是接收者第一次查看，需要扣贝壳
    const isReceiver = note.receiver_openid === OPENID
    if (isReceiver && !note.is_viewed) {
      // 获取当前用户信息
      const userRes = await db.collection('user').where({
        _openid: OPENID
      }).get()

      if (userRes.data.length === 0) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      const user = userRes.data[0]
      const remaining = getRemainingShells(user)

      if (remaining < 1) {
        return {
          success: false,
          code: 'NO_SHELLS',
          message: '贝壳不足，观看广告可以获得贝壳，继续玩哦'
        }
      }

      // 标记为已查看，并扣减贝壳
      await db.collection('notes').doc(noteId).update({
        data: {
          is_viewed: true
        }
      })

      await db.collection('user').doc(user._id).update({
        data: {
          total_used: (user.total_used || 0) + 1
        }
      })

      note.is_viewed = true
    }

    return {
      success: true,
      data: note,
      message: '获取成功'
    }

  } catch (error) {
    console.error('获取纸条详情失败', error)
    return {
      success: false,
      message: '获取纸条详情失败，请重试'
    }
  }
}
