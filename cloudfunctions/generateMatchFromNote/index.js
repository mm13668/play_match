// 云函数：从纸条生成情侣匹配报告
const cloud = require('wx-server-sdk')
const axios = require('axios')
const config = require('../generateReport/config')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 计算剩余贝壳数量
const getRemainingShells = (user) => {
  const totalShells = user.total_shells || 0
  const totalUsed = user.total_used || 0
  return Math.max(0, 3 + totalShells - totalUsed)
}

// 构造AI提示词
function buildPrompt(person1, person2) {
  return `你是一个专业的关系匹配分析师，请为${person1}和${person2}这对情侣做关系匹配分析。

请严格按照以下JSON格式输出，只返回JSON，不要其他内容：
{
  "score": 匹配分数(0-100之间的整数),
  "short_result": "一句话简短结论，20字以内",
  "full_result": {
    "analysis": "性格契合度分析，100字左右",
    "advantages": "相处优势与雷区，100字左右",
    "tips": "关系升温小贴士，100字左右"
  }
}

要求：
 1. 分数要合理分布，不要总是太高或太低
 2. 语言轻松有趣，符合年轻人说话方式
 3. 内容积极正向，给出建设性建议
 4. 结合两人姓名和情侣关系给出个性化分析
 5. 严格按照JSON格式返回，不要有多余内容`
}

// 调用豆包API
async function callDoubao(prompt) {
  try {
    const model = process.env.DOUBAO_MODEL || config.DOUBAO_MODEL
    const apiKey = process.env.DOUBAO_API_KEY || config.DOUBAO_API_KEY
    const response = await axios.post(config.DOUBAO_API_URL, {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: config.DOUBAO_TEMPERATURE
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    const result = response.data
    if (result && result.choices && result.choices.length > 0) {
      return result.choices[0].message.content
    }
    return null
  } catch (error) {
    console.error('调用豆包API失败', error)
    return null
  }
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

    // 2. 权限检查：只能是发送者或接收者生成
    if (note.sender_openid !== OPENID && note.receiver_openid !== OPENID) {
      return {
        success: false,
        message: '无权限生成匹配报告'
      }
    }

    // 3. 检查贝壳数量
    const userRes = await db.collection('user').where({
      _openid: OPENID
    }).get()

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const currentUser = userRes.data[0]
    const remaining = getRemainingShells(currentUser)
    if (remaining < 1) {
      return {
        success: false,
        code: 'NO_SHELLS',
        message: '贝壳不足，观看广告可以获得贝壳，继续玩哦'
      }
    }

    // 4. 获取两个人的昵称
    const person1Name = note.sender_nick
    const person2Name = note.is_replied ? 
      (await db.collection('user').where({ _openid: note.reply_openid }).get()).data[0]?.nickname : 
      (await db.collection('user').where({ _openid: note.receiver_openid }).get()).data[0]?.nickname

    if (!person2Name) {
      return {
        success: false,
        message: '获取对方信息失败'
      }
    }

    // 5. 检查是否已有相同匹配记录（缓存复用，节省API调用）
    const normalizedName1 = person1Name.trim().toLowerCase()
    const normalizedName2 = person2Name.trim().toLowerCase()
    
    let existingQuery1 = db.collection('test_record').where({
      person1_name: db.RegExp({
        regexp: '^' + normalizedName1 + '$',
        options: 'i'
      }),
      person2_name: db.RegExp({
        regexp: '^' + normalizedName2 + '$',
        options: 'i'
      }),
      relation_type: 1
    })

    const existing1 = await existingQuery1.get()

    if (existing1.data.length > 0) {
      // 找到匹配，直接返回，仍然扣用户次数
      await db.collection('user').doc(currentUser._id).update({
        data: {
          total_used: (currentUser.total_used || 0) + 1
        }
      })

      // 标记纸条已生成匹配报告
      await db.collection('notes').doc(noteId).update({
        data: {
          match_report_generated: true
        }
      })

      return {
        success: true,
        data: {
          reportId: existing1.data[0]._id,
          cached: true
        },
        message: '匹配报告生成成功'
      }
    }

    // 检查顺序反过来的情况
    let existingQuery2 = db.collection('test_record').where({
      person1_name: db.RegExp({
        regexp: '^' + normalizedName2 + '$',
        options: 'i'
      }),
      person2_name: db.RegExp({
        regexp: '^' + normalizedName1 + '$',
        options: 'i'
      }),
      relation_type: 1
    })

    const existing2 = await existingQuery2.get()

    if (existing2.data.length > 0) {
      await db.collection('user').doc(currentUser._id).update({
        data: {
          total_used: (currentUser.total_used || 0) + 1
        }
      })

      await db.collection('notes').doc(noteId).update({
        data: {
          match_report_generated: true
        }
      })

      return {
        success: true,
        data: {
          reportId: existing2.data[0]._id,
          cached: true
        },
        message: '匹配报告生成成功'
      }
    }

    // 6. 调用豆包API生成新报告
    const prompt = buildPrompt(person1Name, person2Name)
    const aiResultRaw = await callDoubao(prompt)

    if (!aiResultRaw) {
      return {
        success: false,
        message: 'AI生成报告失败，请重试'
      }
    }

    // 7. 解析AI返回结果
    let aiResult
    try {
      // 清理可能的markdown代码块标记
      let cleanResult = aiResultRaw.trim()
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.replace(/^```json\n/, '').replace(/\n```$/, '')
      } else if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/^```\n/, '').replace(/\n```$/, '')
      }
      aiResult = JSON.parse(cleanResult)
    } catch (e) {
      console.error('解析AI结果失败', aiResultRaw)
      return {
        success: false,
        message: '解析报告失败，请重试'
      }
    }

    // 8. 保存报告到数据库
    const result = await db.collection('test_record').add({
      data: {
        user_openid: OPENID,
        person1_name: person1Name,
        person2_name: person2Name,
        relation_type: 1, // 固定为情侣关系
        match_score: aiResult.score,
        short_result: aiResult.short_result,
        full_result: aiResult.full_result,
        is_unlocked: true, // 已经扣过贝壳，直接解锁
        create_time: new Date()
      }
    })

    // 9. 扣减用户贝壳
    await db.collection('user').doc(currentUser._id).update({
      data: {
        total_used: (currentUser.total_used || 0) + 1
      }
    })

    // 10. 标记纸条已生成匹配报告
    await db.collection('notes').doc(noteId).update({
      data: {
        match_report_generated: true
      }
    })

    return {
      success: true,
      data: {
        reportId: result._id,
        cached: false
      },
      message: '匹配报告生成成功'
    }

  } catch (error) {
    console.error('生成匹配报告失败', error)
    return {
      success: false,
      message: '生成匹配报告失败，请重试'
    }
  }
}
