# play_match 项目信息
小程序名称: 去玩匹配
简称: 去玩
核心定位: AI驱动的双人关系匹配测试，用户输入两个人名字和关系类型，AI生成专属匹配报告（免费看短结果，付费/看广告解锁完整报告）
技术栈: 微信小程序原生 + 微信云开发 + 字节跳动豆包AI API

一、项目目录结构
play_match/
├── app.js                              # 小程序入口 - 云开发初始化 ✓
├── app.json                            # 全局配置 - 导航栏+底部导航 ✓
├── app.wxss                            # 全局样式 ✓
├── sitemap.json                        # 搜索配置 ✓
├── project.config.json                 # 项目配置（已开启云开发）✓
├── project.private.config.json         # 私有配置 ✓
├── pages/
│   ├── index/                          # 首页 ✓
│   │   ├── index.js                    # 逻辑：表单验证、调用云函数、历史记录
│   │   ├── index.wxml                  # 页面结构：品牌区+表单+历史记录
│   │   ├── index.wxss                  # 样式
│   │   └── index.json                  # 组件配置
│   ├── result/                         # 结果页 ✓
│   │   ├── result.js                   # 逻辑：加载报告、解锁功能
│   │   ├── result.wxml                 # 页面结构：分数展示+模糊锁定内容
│   │   ├── result.wxss                 # 样式
│   │   └── result.json
│   └── my/                             # 个人中心 ✓
│       ├── my.js                       # 逻辑：登录、加载记录
│       ├── my.wxml                     # 页面结构：用户信息+功能菜单+记录列表
│       ├── my.wxss                     # 样式
│       └── my.json
├── components/                         # 自定义组件目录（预留）✓
├── cloudfunctions/                     # 云函数目录 ✓
│   ├── generateReport/                 # AI生成报告 ✓
│   │   ├── index.js                    # 主逻辑：调用豆包API + 保存数据库
│   │   ├── config.js                   # API配置
│   │   └── package.json                # 依赖（wx-server-sdk, axios）
│   ├── createOrder/                    # 创建订单 ✓
│   │   ├── index.js                    # 主逻辑：微信支付下单
│   │   └── package.json
│   └── generateShareCode/              # 生成分享码 ✓
│       ├── index.js
│       └── package.json
└── utils/
    ├── config.js                       # 全局配置 ✓
    └── utils.js                        # 工具函数 ✓
二、替换云开发环境ID
在 app.js 第 8 行，将 your-env-id 替换为你的云开发环境ID：
wx.cloud.init({
  env: '你的云开发环境ID', // ⬅️ 这里替换
  traceUser: true
})
怎么找环境ID：
1. 打开微信开发者工具 → 云开发 → 设置 → 环境ID
2. 复制粘贴到此处即可
三、创建数据库集合
请在微信开发者工具 → 云开发 → 数据库 中创建以下 3 个集合：
1. user - 用户信息
2. test_record - 测试记录
3. order - 订单
四、配置豆包API Key
在 cloudfunctions/generateReport/config.js 中，替换你的API Key：
module.exports = {
  DOUBAO_API_KEY: '你的豆包API Key', // ⬅️ 这里替换
  ...
}
五、安装 Vant Weapp 组件
你需要在开发者工具中通过 npm 安装，或者手动下载：
方法一（推荐）：
npm init
npm install @vant/weapp --save
然后在开发者工具 → 工具 → 构建 npm
六、部署云函数
在微信开发者工具中：
1. 右键点击 cloudfunctions/generateReport → 上传并部署：云端安装依赖
2. 右键点击 cloudfunctions/createOrder → 上传并部署：云端安装依赖  
3. 右键点击 cloudfunctions/generateShareCode → 上传并部署：云端安装依赖
七、添加合法域名
在微信公众平台 → 开发 → 开发设置 → 服务器域名 → request合法域名 添加：
https://aquasearch.bytedance.com