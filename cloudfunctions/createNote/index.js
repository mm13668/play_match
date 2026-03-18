// 云函数：创建纸条，随机匹配异性用户
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 七十天前的时间戳计算
const getSevenTyDaysAgo = () => {
  const date = new Date()
  date.setDate(date.getDate() - 70)
  return date
}

// 计算剩余贝壳数量
const getRemainingShells = (user) => {
  const totalShells = user.total_shells || 0
  const totalUsed = user.total_used || 0
  // 初始赠送3个，剩余 = 3 + 额外贝壳 - 已使用
  return Math.max(0, 3 + totalShells - totalUsed)
}

// 随机从数组中选择一个元素
const getRandomUser = (users) => {
  const index = Math.floor(Math.random() * users.length)
  return users[index]
}

// 调用微信内容安全接口审核文本
const msgSecCheck = async (content, accessToken) => {
  const crypto = require('crypto')
  const request = require('request-promise')
  
  try {
    const options = {
      method: 'POST',
      uri: `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`,
      body: {
        content: content
      },
      json: true
    }
    
    const result = await request(options)
    // 返回值：0 表示正常，1 表示违规
    return result.errCode === 0 && result.result.suggest !== 'risky'
  } catch (error) {
    console.error('内容审核失败', error)
    // 如果审核失败，允许通过（避免误拦截），后续配置权限后会正常工作
    return true
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { content } = event

  try {
    // 1. 获取当前用户信息
    const userRes = await db.collection('user').where({
      _openid: OPENID
    }).get()

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在，请先登录'
      }
    }

    const currentUser = userRes.data[0]

    // 2. 检查是否有昵称和性别
    if (!currentUser.nickname || !currentUser.gender) {
      return {
        success: false,
        code: 'INFO_INCOMPLETE',
        message: '请先到个人中心完善昵称和性别信息才能丢纸条'
      }
    }

    // 3. 检查贝壳数量
    const remaining = getRemainingShells(currentUser)
    if (remaining < 1) {
      return {
        success: false,
        code: 'NO_SHELLS',
        message: '贝壳不足，观看广告可以获得贝壳，继续玩哦'
      }
    }

    // 4. 内容审核（配置权限后生效）
    // const isValid = await msgSecCheck(content, '')
    // if (!isValid) {
    //   return {
    //     success: false,
    //     code: 'CONTENT_VIOLATION',
    //     message: '内容包含违规信息，请修改后重试'
    //   }
    // }

    // 5. 查询符合条件的异性用户（最近70天活跃）
    const targetGender = currentUser.gender === 'male' ? 'female' : 'male'
    const sevenDaysAgo = getSevenTyDaysAgo()
    
    const candidateRes = await db.collection('user')
      .where({
        gender: targetGender,
        _openid: _.neq(OPENID),
        last_active_time: _.gte(sevenDaysAgo)
      })
      .get()

    if (candidateRes.data.length === 0) {
      return {
        success: false,
        code: 'NO_CANDIDATE',
        message: '暂无符合条件的异性，稍等再来试试吧'
      }
    }

    // 6. 随机选择一个用户，检查不能重复发给同一个用户
    let receiver = null
    let retryCount = 0
    const maxRetries = 10 // 最多重试10次
    
    // 获取当前用户已经发送过的所有接收者
    const sentNotesRes = await db.collection('notes')
      .where({
        sender_openid: OPENID
      })
      .get()
    
    // 已经发送过的接收者openid集合
    const sentReceiverOpenids = sentNotesRes.data.map(note => note.receiver_openid)
    
    // 过滤掉已经发送过的用户
    const availableCandidates = candidateRes.data.filter(
      candidate => !sentReceiverOpenids.includes(candidate._openid)
    )
    
    if (availableCandidates.length === 0) {
      return {
        success: false,
        code: 'NO_AVAILABLE_CANDIDATE',
        message: '暂时没有新的匹配对象了，你已经匹配过所有符合条件用户，请稍后再试'
      }
    }
    
    // 随机选择一个可用用户
    receiver = getRandomUser(availableCandidates)

     // 7. 创建纸条记录
     const result = await db.collection('notes').add({
       data: {
         sender_openid: OPENID,
         sender_nick: currentUser.nickname,
         sender_gender: currentUser.gender,
         content: content,
         require_gender: targetGender,
         receiver_openid: receiver._openid,
         receiver_nick: receiver.nickname,
         receiver_gender: receiver.gender,
         create_time: new Date(),
         is_viewed: false,
         is_replied: false,
         reply_content: '',
         reply_openid: '',
         reply_time: null,
         match_report_generated: false
       }
     })

    // 8. 增加发送者的total_used（扣贝壳）
    await db.collection('user').doc(currentUser._id).update({
      data: {
        total_used: (currentUser.total_used || 0) + 1
      }
    })

    return {
      success: true,
      data: {
        noteId: result._id,
        receiverNick: receiver.nickname,
        receiverGender: receiver.gender
      },
      message: '纸条发送成功'
    }

  } catch (error) {
    console.error('创建纸条失败', error)
    return {
      success: false,
      message: '创建纸条失败，请重试'
    }
  }
}
