// 云函数：创建付费订单
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 价格配置
const PRICES = {
  single_unlock: 0.99
}

exports.main = async (event, context) => {
  const { recordId, productType } = event
  const { OPENID, APPID } = cloud.getWXContext()

  try {
    // 检查订单是否存在
    if (productType === 'single_unlock') {
      // 直接获取记录，检查是否已解锁
      const recordRes = await db.collection('test_record').doc(recordId).get()
      if (recordRes.data.is_unlocked) {
        return {
          success: false,
          message: '报告已解锁'
        }
      }
    }

    const amount = PRICES[productType] * 100 // 转为分
    const orderId = `${Date.now()}${Math.floor(Math.random() * 1000)}`

    // 创建订单
    await db.collection('order').add({
      data: {
        order_id: orderId,
        user_openid: OPENID,
        product_type: productType,
        record_id: recordId,
        amount: PRICES[productType],
        pay_status: 'pending',
        create_time: db.serverDate()
      }
    })

    // 创建支付单
    const payment = await cloud.cloudPay.unifiedOrder({
      body: `解锁完整报告 - ${productType === 'single_unlock' ? '单次解锁' : productType}`,
      outTradeNo: orderId,
      spbillCreateIp: '127.0.0.1',
      totalFee: amount,
      tradeType: 'JSAPI',
      appid: APPID,
      openid: OPENID
    })

    return {
      success: true,
      payment: {
        timeStamp: payment.timeStamp,
        nonceStr: payment.nonceStr,
        package: payment.package,
        signType: payment.signType,
        paySign: payment.paySign
      },
      orderId
    }
  } catch (error) {
    console.error('创建订单失败', error)
    return {
      success: false,
      message: '创建订单失败，请重试'
    }
  }
}
