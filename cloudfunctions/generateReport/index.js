// 云函数：AI生成匹配报告
const cloud = require('wx-server-sdk')
const axios = require('axios')
const config = require('./config')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 构造AI提示词
function buildPrompt(person1, person2, relationType) {
  const relationMap = {
    '1': '情侣/恋人',
    '2': '朋友',
    '3': '同事',
    '4': '家人'
  }
  const relation = relationMap[relationType] || '朋友'

  return `你是一个专业的关系匹配分析师，请为${person1}和${person2}这对${relation}做关系匹配分析。

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
 4. 结合两人姓名和关系类型给出个性化分析
 5. 严格按照JSON格式返回，不要有多余内容`
}

// 调用豆包API
async function callDoubao(prompt) {
  try {
    const model = process.env.DOUBAO_MODEL || config.DOUBAO_MODEL
    console.log('调用豆包API', config.DOUBAO_API_URL, model)
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
        'Authorization': `Bearer ${config.DOUBAO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    })

    console.log('API响应成功', response.status)
    const content = response.data.choices[0].message.content
    console.log('AI返回内容', content)
    
    let jsonStr = content.trim()
    // 处理各种markdown格式
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim()
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim()
    }
    
    // 清理可能的多余字符
    jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim()
    
    try {
      const result = JSON.parse(jsonStr)
      console.log('JSON解析成功', result)
      return result
    } catch (parseError) {
      console.error('JSON解析失败，尝试修复', parseError, '原始内容:', jsonStr)
      // 返回默认结果
      return {
        score: Math.floor(Math.random() * 31) + 60,
        "short_result": "你们相当有默契呢",
        "full_result": {
          "analysis": "你们两人性格互补，能够理解对方的想法，在大多数事情上容易达成共识。",
          "advantages": "优势在于互相信任，雷区是要注意不要因为太熟悉而忽略对方感受。",
          "tips": "多一起参加有趣的活动，共同创造美好回忆，能让关系更加紧密。"
        }
      }
    }
  } catch (error) {
    console.error('调用豆包API失败', error.response ? error.response.data : error)
    return {
      score: 75,
      "short_result": "你们相当默契呢",
      "full_result": {
        "analysis": "你们两人性格互补，能够理解对方的想法，在大多数事情上容易达成共识。",
        "advantages": "优势在于互相信任，雷区是要注意不要因为太熟悉而忽略对方感受。",
        "tips": "多一起参加有趣的活动，共同创造美好回忆，能让关系更加紧密。"
      }
    }
  }
}

// 免费次数限制
const FREE_GENERATE_LIMIT = 3

// 云函数入口
exports.main = async (event, context) => {
  const { person1_name, person2_name, relation_type } = event
  const { OPENID } = cloud.getWXContext()
  const relationType = relation_type || '1'

  try {
    // 检查用户已生成次数
    let totalTests = 0
    let adFreeTimes = 0
    
    try {
      const userRes = await db.collection('user').where({
        _openid: OPENID
      }).get()
      
      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        totalTests = Number(user.total_tests || 0)
        adFreeTimes = Number(user.ad_free_times || 0)
      }
      
      const totalAllowed = FREE_GENERATE_LIMIT + adFreeTimes
      console.log('[check] totalTests=', totalTests, 'totalAllowed=', totalAllowed)
      
      // 达到免费次数限制
      if (totalTests >= totalAllowed) {
        return {
          success: false,
          message: `免费次数已用完\n看广告可以获得更多免费机会`,
          code: 'LIMIT_EXCEEDED'
        }
      }
    } catch (e) {
      console.error('查询用户信息失败', e)
      // 查询失败不阻止，继续生成
    }

    // ===== 新增：检查是否已经生成过相同测试，直接返回结果 =====
    // 统一姓名大小写并去除两边空格
    const p1 = person1_name.trim().toLowerCase()
    const p2 = person2_name.trim().toLowerCase()
    const relationNum = parseInt(relationType)
    // 查询已有记录
    try {
      // 先查询AB顺序，因为云开发不支持复杂$or查询，分开查询
      const existRes = await db.collection('test_record')
        .where({
          user_openid: OPENID,
          relation_type: relationNum
        })
        .get()
      
      let existRecord = null
      // 在内存中过滤匹配姓名的记录（大小写不敏感）
      if (existRes.data.length > 0) {
        existRecord = existRes.data.find(item => {
          const ip1 = item.person1_name.trim().toLowerCase()
          const ip2 = item.person2_name.trim().toLowerCase()
          // 匹配正序AB 或者反序BA
          return (ip1 === p1 && ip2 === p2) || (ip1 === p2 && ip2 === p1)
        })
      }

      // 如果找到了已有记录，直接返回，不调用AI
      if (existRecord) {
        console.log('[缓存命中]找到已有记录，直接返回', existRecord._id)
        const result = {
          score: existRecord.match_score,
          short_result: existRecord.short_result,
          full_result: existRecord.full_result
        }

        // 仍然要增加次数吗？用户这次确实重新生成了，还是要算次数
        // 更新用户测试次数
        try {
          const userRes = await db.collection('user').where({
            _openid: OPENID
          }).get()

          if (userRes.data.length > 0) {
            const user = userRes.data[0]
            await db.collection('user').doc(user._id).update({
              data: {
                total_tests: (user.total_tests || 0) + 1
              }
            })
          } else {
            await db.collection('user').add({
              data: {
                _openid: OPENID,
                nickname: '',
                avatar: '',
                create_time: db.serverDate(),
                total_tests: 1,
                ad_free_times: 0
              }
            })
          }
        } catch (e) {
          console.error('更新用户次数失败', e)
        }

        const totalAllowed = FREE_GENERATE_LIMIT + adFreeTimes
        const remaining = totalAllowed - (totalTests + 1)

        return {
          success: true,
          recordId: existRecord._id,
          data: result,
          cached: true,
          remaining: remaining >= 0 ? remaining : 0
        }
      }
    } catch (cacheError) {
      console.error('查询缓存失败，继续调用AI', cacheError)
    }
    // ===== 缓存检查结束 =====

    // 构造prompt调用AI
    const prompt = buildPrompt(person1_name, person2_name, relationType)
    const result = await callDoubao(prompt)

    // 保存到数据库
    // 如果还有免费次数，直接解锁完整报告
    const totalAllowed = FREE_GENERATE_LIMIT + adFreeTimes
    const isUnlocked = totalTests < totalAllowed
    
    const saveResult = await db.collection('test_record').add({
      data: {
        user_openid: OPENID,
        person1_name,
        person2_name,
        relation_type: parseInt(relationType),
        match_score: result.score,
        short_result: result.short_result,
        full_result: result.full_result,
        is_unlocked: isUnlocked,
        create_time: db.serverDate()
      }
    })

    // 更新用户测试次数
    try {
      const userRes = await db.collection('user').where({
        _openid: OPENID
      }).get()

      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        await db.collection('user').doc(user._id).update({
          data: {
            total_tests: (user.total_tests || 0) + 1
          }
        })
      } else {
        // 新用户创建记录，保证计数正确：total_tests 已经用掉一次 = 1
        await db.collection('user').add({
          data: {
            _openid: OPENID,
            nickname: '',
            avatar: '',
            create_time: db.serverDate(),
            total_tests: 1,
            ad_free_times: 0
          }
        })
      }
    } catch (e) {
      console.error('更新用户次数失败', e)
    }

    const remaining = (FREE_GENERATE_LIMIT + adFreeTimes) - (totalTests + 1)
    
    return {
      success: true,
      recordId: saveResult._id,
      data: result,
      remaining: remaining >= 0 ? remaining : 0
    }
  } catch (error) {
    console.error('生成报告失败', error)
    return {
      success: false,
      message: '生成报告失败，请重试'
    }
  }
}
