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

  try {
    // 检查用户已生成次数
    let userData = null
    let totalTests = 0
    let isVip = false
    let adFreeTimes = 0
    const relationType = relation_type || '1'
    
    try {
      const userRes = await db.collection('user').where({
        _openid: OPENID
      }).get()
      
      if (userRes.data.length > 0) {
        userData = userRes.data[0]
        totalTests = userData.total_tests || 0
        isVip = userData.is_vip || false
        adFreeTimes = userData.ad_free_times || 0
      }

      console.log("totalTests",totalTests)
      console.log("adFreeTimes",adFreeTimes)
      
      const totalAllowed = FREE_GENERATE_LIMIT + adFreeTimes
      // 非VIP且已达到免费次数限制
      if (!isVip && totalTests >= totalAllowed) {
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

    // 构造prompt调用AI
    const prompt = buildPrompt(person1_name, person2_name, relationType)
    const result = await callDoubao(prompt)

    // 保存到数据库
    // 如果还有免费次数 或者 是VIP，直接解锁完整报告
    const totalAllowed = FREE_GENERATE_LIMIT + adFreeTimes
    const isUnlocked = isVip || totalTests < totalAllowed
    
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
        // 新用户创建记录
        await db.collection('user').add({
          data: {
            _openid: OPENID,
            nickname: '',
            avatar: '',
            create_time: db.serverDate(),
            total_tests: 1,
            is_vip: false,
            ad_free_times: 0,
            vip_expire_time: null
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
      remaining: remaining >= 0 ? remaining : 0,
      isVip: isVip
    }
  } catch (error) {
    console.error('生成报告失败', error)
    return {
      success: false,
      message: '生成报告失败，请重试'
    }
  }
}
