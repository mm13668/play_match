# 去玩匹配 微信小程序开发指南

## 项目概述

「去玩匹配」是一个AI驱动的双人关系匹配测试微信小游戏，同时集成了悄悄话笔记功能，基于微信云开发和字节跳动豆包AI大模型API开发。

**技术栈：** 微信小程序原生开发 + 微信云开发 + Vant Weapp UI组件库

## 构建命令

本项目是通过微信开发者工具管理的微信小程序项目，没有定义npm构建脚本。

```bash
# 安装依赖（Vant Weapp组件库）
npm install

# npm安装完成后，在微信开发者工具中执行：
# 1. 工具 → 构建 npm
# 2. 编译项目
```

## 代码风格指南

### 文件结构
```
pages/           # 页面文件 (.js, .wxml, .wxss, .json)
components/      # 自定义组件
cloudfunctions/  # 云函数
utils/           # 工具函数
images/          # 静态图片
doc/             # 项目文档
```

### 命名规范
- **文件：** 小写连字符分隔 (例如 `index.js`, `my-page.wxml`)
- **页面：** 描述性名称 (index, result, my, records)
- **变量：** 驼峰命名 (camelCase)
- **常量：** 大写下划线分隔 (UPPER_SNAKE_CASE)
- **云函数：** 驼峰命名 (例如 `generateReport`, `createOrder`)

### JavaScript 风格
- 使用 ES6+ 特性（箭头函数、const/let、async/await）
- 始终使用严格相等 (`===`, `!==`)
- 避免使用 `var`，优先使用 `const`（默认）或 `let`
- 在异步函数中使用 `try/catch` 处理错误
- 复杂函数需要添加 JSDoc 注释

示例：
```javascript
/**
 * 格式化日期为中文字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
};
```

### 微信小程序开发规范
- 使用 `wx.` API 时需要正确处理错误
- 始终处理云函数调用错误
- 优先使用 Vant Weapp 组件（已在 `app.json` `usingComponents` 中定义）
- 可复用数据存放在 `app.js` `globalData` 中
- 使用 `wxss` 编写样式，遵循项目配色方案（主色：`#FF6B6B`）

### 云函数开发规范
- 始终引入 `wx-server-sdk` 依赖
- 使用 async/await 模式
- 错误处理，返回结构化响应
- 敏感配置存放在独立的 `config.js` 文件中

示例：
```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  try {
    // 函数逻辑
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

## 关键项目信息

### 依赖
- `@vant/weapp`: ^1.11.7（UI组件库）

### 云函数列表
1. `generateReport`: 使用字节跳动豆包API生成AI匹配报告（核心功能）
2. `createOrder`: 创建微信支付订单
3. `generateShareCode`: 生成分享邀请码
4. `addTotalShells`: 增加贝壳数量（广告/分享奖励）
5. `getOpenId`: 获取用户OpenID用于身份验证
6. `updateUserInfo`: 更新用户信息到数据库
7. `createNote`: 创建悄悄话笔记
8. `getMyNotes`: 获取用户的笔记列表
9. `getNoteDetail`: 获取笔记详情和回复列表
10. `replyNote`: 回复已有笔记
11. `generateMatchFromNote`: 从笔记分享进入匹配（处理邀请关系）
12. `updateLastActiveTime`: 更新用户最后活跃时间

### 数据库集合
- `user`: 用户信息
- `test_record`: 测试历史记录
- `order`: 支付订单
- `share_codes`: 分享邀请码关系映射
- `note`: 悄悄话笔记
- `reply`: 笔记回复

### 重要提示
- 在 `app.js` 第7行替换云开发环境ID
- 在 `cloudfunctions/generateReport/config.js` 配置豆包API密钥
- 在微信公众平台添加 `https://ark.cn-beijing.volces.com` 到请求合法域名白名单

## 功能模块说明

### 关系匹配模块
- 用户输入两个人姓名和关系类型
- AI生成匹配报告，包含分数、分析、优势和建议
- 部分内容锁定，需要观看广告或付费解锁
- 支持生成分享海报

### 悄悄话笔记模块
- 用户可以发布匿名真心话
- 分享笔记给好友，好友可查看并匿名回复
- 支持公开到笔记列表，让更多人互动
- 作者可以看到所有回复

## 测试

本项目目前没有配置自动化测试框架，需要通过微信开发者工具进行手动测试。

如果添加测试：
- 考虑使用 Jest 或类似 JavaScript 测试框架
- 测试文件和源文件放在一起，后缀使用 `.test.js` 或 `.spec.js`
- 云函数和UI组件分开测试

---

*本指南基于当前项目结构和约定编写，随着项目演进请及时更新。*