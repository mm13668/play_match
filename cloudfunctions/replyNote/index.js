// 云函数：回复纸条
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 调用微信内容安全接口审核文本
const msgSecCheck = async (content, accessToken) => {
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
    return result.errCode === 0 && result.result.suggest !== 'risky'
  } catch (error) {
    console.error('内容审核失败', error)
    return true
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { noteId, replyContent } = event

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

    // 2. 权限检查：只能接收者回复，且只能回复一次
    if (note.receiver_openid !== OPENID) {
      return {
        success: false,
        message: '无权限回复此纸条'
      }
    }

    if (note.is_replied) {
      return {
        success: false,
        message: '该纸条已回复，不能再次回复'
      }
    }

    // 3. 内容审核
    const isValid = await msgSecCheck(replyContent, '')
    if (!isValid) {
      return {
        success: false,
        code: 'CONTENT_VIOLATION',
        message: '内容包含违规信息，请修改后重试'
      }
    }

    // 4. 更新纸条回复信息
    await db.collection('notes').doc(noteId).update({
      data: {
        is_replied: true,
        reply_content: replyContent,
        reply_openid: OPENID,
        reply_time: new Date()
      }
    })

    return {
      success: true,
      message: '回复成功'
    }

  } catch (error) {
    console.error('回复纸条失败', error)
    return {
      success: false,
      message: '回复失败，请重试'
    }
  }
}
