# 去玩匹配 - 微信小程序

AI驱动的双人关系匹配测试微信小游戏，基于字节跳动豆包AI大模型API和微信云开发。

## 项目介绍

「去玩匹配」是一个趣味关系测试小程序，用户输入两个人的姓名和关系类型，AI会生成专属的关系匹配分析报告，包含匹配分数、契合度分析、相处优势和关系建议。

项目采用免费增值模式：新用户获得免费体验次数，观看激励视频广告、分享邀请好友均可获得额外免费次数，也可以通过微信支付直接解锁完整报告，兼具趣味性和商业变现能力。

## 功能特性

- ✨ **AI智能分析** - 基于豆包1.5大模型生成个性化关系匹配报告
- 🎭 **多种关系类型** - 支持情侣、朋友、同事、家人四种关系
- 🔓 **多种解锁方式** - 免费次数、观看广告、微信支付解锁完整内容
- 📜 **历史记录** - 自动保存所有测试记录，随时查看回顾
- 📤 **分享海报** - 生成精美分享海报，分享成功获得免费次数
- 👤 **个人中心** - 个人资料管理，查看使用统计数据
- 💬 **邀请奖励** - 好友通过分享进入，双方都获得免费奖励

## 技术栈

- **前端:** 微信小程序原生开发 (JavaScript + WXML + WXSS)
- **后端:** 微信云开发（云函数 + 云数据库）
- **AI服务:** 字节跳动豆包AI API (Doubao 1.5 Lite 32K)
- **UI组件:** Vant Weapp v1.11.7
- **支付:** 微信支付集成
- **变现:** 激励视频广告 + 付费解锁 + 分享裂变

## 项目结构

```
├── app.js                              # 小程序入口，云开发初始化，全局用户状态管理
├── app.json                            # 全局配置，页面路由、导航栏、底部标签栏
├── app.wxss                            # 全局样式
├── sitemap.json                        # 微信搜索配置
├── package.json                        # 项目依赖信息
├── project.config.json                 # 微信开发者工具项目配置
├── pages/                              # 页面目录
│   ├── index/                          # 首页
│   │   ├── index.js                    # 表单输入、次数检查、调用云函数、历史展示
│   │   ├── index.wxml                  # 页面结构：品牌区+表单+最近历史
│   │   ├── index.wxss                  # 样式文件
│   │   └── index.json
│   ├── result/                         # 结果页
│   │   ├── result.js                   # 加载报告、解锁功能、海报生成分享
│   │   ├── result.wxml                 # 分数展示+模糊锁定效果
│   │   ├── result.wxss
│   │   └── result.json
│   ├── my/                             # 个人中心
│   │   ├── my.js                       # 登录、用户信息、功能入口
│   │   ├── my.wxml
│   │   ├── my.wxss
│   │   └── my.json
│   ├── records/                        # 测试记录列表
│   │   ├── records.js                  # 加载展示所有历史记录
│   │   ├── records.wxml
│   │   ├── records.wxss
│   │   └── records.json
│   └── edit-profile/                   # 编辑个人资料
│       ├── edit-profile.js
│       ├── edit-profile.wxml
│       ├── edit-profile.wxss
│       └── edit-profile.json
├── components/                         # 自定义组件目录（目前为空）
├── cloudfunctions/                     # 云函数目录
│   ├── generateReport/                 # AI生成匹配报告（核心功能）
│   │   ├── index.js                    # 次数检查、缓存查询、调用AI、保存结果
│   │   ├── config.js                   # API配置（已加入.gitignore保护密钥）
│   │   └── package.json
│   ├── createOrder/                    # 创建微信支付订单
│   │   ├── index.js
│   │   └── package.json
│   ├── generateShareCode/              # 生成分享短码
│   │   ├── index.js
│   │   └── package.json
│   ├── addTotalShells/                   # 增加贝壳数量
│   │   ├── index.js                    # 处理广告/分享奖励
│   │   └── package.json
│   ├── getOpenId/                      # 获取用户OpenID
│   │   ├── index.js
│   │   └── package.json
│   └── updateUserInfo/                 # 更新用户信息
│       ├── index.js
│       └── package.json
├── utils/
│   ├── config.js                       # 前端全局配置
│   └── utils.js                        # 通用工具函数
├── images/                             # 静态资源图片（底部标签栏图标等）
├── node_modules/                       # npm依赖
└── miniprogram_npm/                    # 微信开发者工具编译后的npm依赖
```

## 数据库设计

| 集合 | 说明 |
|------|------|
| `user` | 用户信息（昵称、头像、次数统计）|
| `test_record` | 测试记录（两个人信息、匹配结果、解锁状态）|
| `order` | 支付订单信息 |
| `share_codes` | 分享码与分享者关联映射 |

### user 集合字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户微信OpenID |
| `nickname` | string | 用户昵称 |
| `avatar` | string | 用户头像URL |
| `create_time` | Date | 创建时间 |
| `total_used` | number | 累计消耗次数 |
| `total_shells` | number | 总共获得次数 |

### test_record 集合字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `user_openid` | string | 用户OpenID |
| `person1_name` | string | 第一个人姓名 |
| `person2_name` | string | 第二个人姓名 |
| `relation_type` | number | 关系类型 (1:情侣 2:朋友 3:同事 4:家人) |
| `match_score` | number | 匹配分数 (0-100) |
| `short_result` | string | 简短结论（免费预览）|
| `full_result` | object | 完整结果 `{analysis, advantages, tips}` |
| `is_unlocked` | boolean | 是否已解锁完整内容 |
| `create_time` | Date | 创建时间 |

## 快速部署

### 前置准备
1. 微信开发者工具
2. 微信小程序AppID（已认证）
3. 微信云开发环境（已开通）
4. 字节跳动豆包API Key

### 部署步骤

1. **克隆/导入项目**
   ```bash
   # 克隆项目到本地
   git clone <repository-url>
   cd ai_code
   ```

2. **安装依赖**
   ```bash
   npm install
   ```
   然后在微信开发者工具中：`工具 → 构建 npm`

3. **配置云开发环境ID**

   编辑 `app.js`，替换为你的云开发环境ID：
   ```javascript
   wx.cloud.init({
     env: '你的云开发环境ID',
     traceUser: true
   })
   ```

4. **创建数据库集合**

   在云开发控制台 → 数据库，创建以下集合：
   - `user`
   - `test_record`
   - `order`
   - `share_codes`

5. **配置豆包API Key**

   编辑 `cloudfunctions/generateReport/config.js`：
   ```javascript
   module.exports = {
     DOUBAO_API_KEY: '你的豆包API Key',
     DOUBAO_API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
     DOUBAO_MODEL: 'doubao-1-5-lite-32k-250115',
     DOUBAO_TEMPERATURE: 0.7
   }
   ```

6. **部署云函数**

   右键点击每个云函数 → 「上传并部署：云端安装依赖」：
   - `generateReport`
   - `createOrder`
   - `generateShareCode`
   - `addTotalShells`
   - `getOpenId`
   - `updateUserInfo`

7. **配置域名白名单**

   在微信公众平台 → 开发 → 开发设置 → server 合法域名 添加：
   ```
   https://ark.cn-beijing.volces.com
   ```

8. **编译运行**

   点击编译，项目即可运行。

## 商业模式

- **免费模式:** 每个新用户默认3次免费生成机会
- **广告变现:** 观看激励视频广告获得额外免费次数
- **分享奖励:** 分享海报，好友通过分享进入，分享者获得免费次数，实现裂变增长
- **付费解锁:** 用户可单次支付解锁完整报告

## 配置说明

### 默认配置项
- `FREE_GENERATE_LIMIT = 3` - 新用户免费次数
- 价格：单篇报告解锁价格可在 `pages/result/result.js` 中修改

### 获取豆包API Key
1. 访问 [字节跳动火山引擎](https://www.volcengine.com/)
2. 开通方舟平台
3. 创建API Key获取访问凭证
4. 填入配置文件即可

## 开发指南

### 代码风格
- 使用 ES6+ 语法，`const`/`let` 优先
- 严格相等 `===`/`!==`
- 驼峰命名变量，大写下划线分隔常量
- 异步函数使用 `async/await` + `try/catch` 错误处理
- 复杂函数添加 JSDoc 注释

### 云函数开发规范
- 统一使用 `wx-server-sdk`
- 使用 async/await 模式
- 返回结构化响应 `{success: true, data: ...}` 或 `{success: false, error: ...}`
- 敏感配置存放于独立 `config.js`，该文件已加入 `.gitignore`，不会被提交到代码仓库

## 常见问题

**Q: 云函数调用失败怎么办？**  
A: 检查云开发环境ID是否正确，云函数是否已部署，依赖是否安装完整。

**Q: AI返回解析错误怎么办？**  
A: 项目已有容错机制，AI返回异常时会使用默认结果。检查API Key是否正确和网络配置。

**Q: 分享不生效怎么办？**  
A: 检查小程序是否已配置分享域名，云函数 `generateShareCode` 是否部署成功。

**Q: 微信支付不成功？**  
A: 检查小程序是否已开通微信支付，商户号是否配置正确，云函数 `createOrder` 是否部署成功。

## 许可证

MIT License
