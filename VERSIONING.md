# 版本号规范

## 语义化版本号 (Semantic Versioning)

版本号格式：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更或重大架构重构
- **MINOR**：向下兼容的功能性新增
- **PATCH**：向下兼容的问题修正

## 版本阶段标识

- `0.x.x`：开发阶段，API 可能频繁变更
- `1.0.0`：首个正式发布版本
- `alpha` / `beta` / `rc`：预发布版本标识

## 发布流程

1. 更新 `package.json` 中的 version 字段
2. 更新 `CHANGELOG.md`，记录该版本的所有变更
3. 提交代码，commit message 包含版本号
4. 创建 git tag：`v{version}`
5. 推送到远程仓库：`git push && git push --tags`

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2026-08-31 | Phase 1 完成：前端 UI 完整化，所有页面视觉风格统一，清理 legacy 代码 |

## 当前版本

**0.1.0** — Phase 1 完成版本

### 已完成
- ✅ 10 个页面全部完成 UI 优化
- ✅ 视觉风格统一（深色背景 #161616，绿色主色调 #3ec470，等宽字体）
- ✅ 清理 legacy 代码和未使用组件
- ✅ TypeScript 编译 0 错误
- ✅ 所有页面响应式布局正常

### 进行中
- 🔄 Phase 2：钱包连接集成

### 计划中
- 📋 Phase 3：核心交易功能
- 📋 Phase 4：数据层升级
- 📋 Phase 5：测试和部署
