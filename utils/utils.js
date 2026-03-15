// 工具函数集合

// 生成随机ID
function generateRandomId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 格式化时间
function formatTime(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`
  }
  
  return `${year}-${month}-${day} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 关系类型文本映射
function getRelationTypeText(type) {
  const map = {
    '1': '情侣',
    '2': '朋友',
    '3': '同事',
    '4': '家人'
  }
  return map[type] || '未知'
}

// 封装云函数调用
function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        if (res.result.success) {
          resolve(res.result.data)
        } else {
          reject(new Error(res.result.message || '调用失败'))
        }
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

module.exports = {
  generateRandomId,
  formatTime,
  getRelationTypeText,
  callCloudFunction
}
