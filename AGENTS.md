# Agent Guide for play_match WeChat Mini Program

## Project Overview
A WeChat Mini Program for AI-powered relationship compatibility testing using WeChat Cloud Development and ByteDance Doubao AI API.

**Tech Stack:** WeChat Mini Program Native + WeChat Cloud Development + Vant Weapp UI

## Build Commands

This is a WeChat Mini Program project managed through WeChat Developer Tools. There are no npm build scripts defined.

```bash
# Install dependencies (Vant Weapp components)
npm install

# After npm install, use WeChat Developer Tools to:
# 1. Build npm (Tools → Build npm)
# 2. Compile the project
```

## Code Style Guidelines

### File Structure
```
pages/           # Page files (.js, .wxml, .wxss, .json)
components/      # Custom components (when needed)
cloudfunctions/  # Cloud functions
utils/           # Utility functions
images/          # Static images
```

### Naming Conventions
- **Files:** lowercase with hyphens (e.g., `index.js`, `my-page.wxml`)
- **Pages:** Descriptive names (index, result, my, records)
- **Variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE
- **Cloud Functions:** camelCase (e.g., `generateReport`, `createOrder`)

### JavaScript Style
- Use ES6+ features (arrow functions, const/let, async/await)
- Always use strict equality (`===`, `!==`)
- Avoid `var`, prefer `const` (default) or `let`
- Handle promises with `try/catch` in async functions
- Include JSDoc comments for complex functions

Example:
```javascript
/**
 * Format date to Chinese string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
};
```

### WeChat Mini Program Specifics
- Use `wx.` APIs with proper error handling
- Always handle cloud function call errors
- Use Vant Weapp components when available (defined in `app.json` `usingComponents`)
- Store reusable data in `app.js` `globalData`
- Use `wxss` for styling following the project's color scheme (primary: `#FF6B6B`)

### Cloud Functions
- Always include `wx-server-sdk` dependency
- Use async/await pattern
- Handle errors and return structured responses
- Store sensitive configs in separate `config.js` files

Example:
```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  try {
    // Function logic
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

## Key Project Information

### Dependencies
- `@vant/weapp`: ^1.11.7 (UI component library)

### Cloud Functions
1. `generateReport`: AI report generation using ByteDance Doubao API
2. `createOrder`: WeChat Pay order creation
3. `generateShareCode`: Share code generation

### Database Collections
- `user`: User information
- `test_record`: Test history records
- `order`: Payment orders

### Important Notes
- Replace cloud environment ID in `app.js` line 7
- Configure Doubao API key in `cloudfunctions/generateReport/config.js`
- Add `https://aquasearch.bytedance.com` to request whitelist

## Testing

This project currently has no automated test framework configured. Manual testing should be done through WeChat Developer Tools.

When adding tests:
- Consider using Jest or similar JavaScript testing framework
- Add test files alongside source files with `.test.js` or `.spec.js` suffix
- Test cloud functions separately from UI components

---

*This guide is based on the current project structure and conventions. Update as the project evolves.*
