const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, avatar, nickname, gender, signature } = event
  
  // 参数验证
  if (!openid) {
    return {
      success: false,
      message: 'openid不能为空'
    }
  }
  
  if (!nickname || nickname.trim() === '') {
    return {
      success: false,
      message: '昵称不能为空'
    }
  }
  
  if (!gender || (gender !== 'male' && gender !== 'female')) {
    return {
      success: false,
      message: '请选择性别'
    }
  }
  
  try {
    // 查询用户是否存在
    const userRes = await db.collection('user').where({
      _openid: openid
    }).get()
    
    const updateData = {
      nickname: nickname.trim(),
      gender: gender,
      signature: signature ? signature.trim() : '',
      update_time: db.serverDate()
    }
    
    // 如果有头像则更新
    if (avatar) {
      updateData.avatar = avatar
    }
    
    if (userRes.data.length > 0) {
      // 更新现有用户
      await db.collection('user').doc(userRes.data[0]._id).update({
        data: updateData
      })
    } else {
      // 创建新用户（理论上不应发生，因为登录时会创建）
      await db.collection('user').add({
        data: {
          _openid: openid,
          ...updateData,
          create_time: db.serverDate(),
          total_used: 0,
          total_shells: 0
        }
      })
    }
    
    return {
      success: true,
      message: '保存成功'
    }
  } catch (err) {
    console.error('更新用户信息失败', err)
    return {
      success: false,
      message: '保存失败，请重试'
    }
  }
}
