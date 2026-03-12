# ArchiveDesk

<div align="center">
  <p>一个面向 Windows 的本地优先数字档案管理工具。</p>
  <p>
    <b>v0.1.0-alpha.1 · 早期预览版</b>
  </p>
</div>

---

## 🚀 简介

ArchiveDesk 是一款关注“本地文件长期管理”的数字档案管理工具，采用 `React` + `Node.js` + `SQLite` 开发，主要用于整理、扫描、浏览和检索本地文件。

当本地积累了大量图片、视频、音频、文档等文件，单纯依赖文件夹层级已经不够用时，ArchiveDesk 能够帮助你在 Windows 桌面环境下更方便地整理和查找本地资源。在功能设计上，我们更倾向于**本地优先、离线优先**，而不是云端优先。

当前支持的核心能力：
- 本地资源库的创建与管理
- 目录扫描与索引写入
- 资源浏览与详情查看
- 关键词搜索
- 调用外部程序打开文件

### 🎯 适用场景

作为一款专注本地的工具，它包含以下适用范围：

- [x] 需要长期整理本地文件的人
- [x] 想做个人数字档案管理的人
- [x] 偏好本地优先、离线优先工作流的人
- [x] 主要在 Windows 桌面环境中使用的人
- [ ] 多人协作场景
- [ ] 云同步场景
- [ ] 企业级权限和流程管理
- [ ] 已经打磨完整的成熟媒体管理体验

## 🚥 当前状态 (Alpha 阶段)

ArchiveDesk 目前仍处于 **早期预览版**，部分高级体验和项目结构仍在持续调整中：
- 稳定性还不足以作为成熟生产工具，数据模型后续可能继续演化。
- 元数据管理能力还比较基础，预览体验还不完整。
- 导入、导出、备份能力还不完善。
- 不同文件类型的高级体验仍在逐步补齐，发行包形式仍在整理中。

## 📦 下载

当前版本定位为 **Windows 早期预览版**。推荐的使用方式：

1. 从 GitHub Releases 下载预览版压缩包
2. 解压到本地目录
3. 按压缩包内说明运行

*提示：如果你希望从源码运行，请查看下方「开发」章节。*

## 👨‍💻 开发

本项目分为前端与后端，前端使用 `React + Vite + TypeScript` （状态管理使用 `Zustand`），后端使用 `Express + TypeScript` （数据库使用 `SQLite`，认证使用 `JWT`）。

### 🌍 环境要求

- Windows 10 / 11
- Node.js
- npm

### ⚙️ 配置

开发前请先参考根目录中的 `.env.example` 进行配置。
常用配置项包括：`PORT`, `DB_PATH`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `QUICKVIEWER_PATH` 等。

### 🏃 运行项目

**后端**（在项目根目录执行）：

```bash
npm install
cp .env.example .env
npm run dev
```
> 默认地址：http://localhost:3000

**前端**（在 `frontend` 目录执行）：

```bash
cd frontend
npm install
npm run dev
```
> 默认地址：http://localhost:5173

### 🛠 常用命令

**根目录：**
```bash
npm run dev           # 启动后端开发服务
npm run build         # 构建后端
npm test              # 运行测试
npm run lint          # 运行代码规范检查
npm run release:check # 统一检查后端构建、测试，以及前端 lint 和构建状态（发版检查）
```

**前端目录：**
```bash
cd frontend
npm run dev           # 启动前端开发服务
npm run build         # 构建前端
npm run lint          # 运行代码规范检查
```

## 🛣 路线图

**近期规划**
- 优化资源库管理流程并提高目录扫描稳定性
- 改进搜索与浏览体验
- 补充截图和发行版资产
- 继续整理文档和项目结构

**中期规划**
- 更完整的元数据管理能力
- 更好的预览与查看体验
- 更适合长期整理和回看的交互流程
- 更稳定的 Windows 本地桌面使用体验

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 参与项目建设！

当前比较适合参与的方向：
- Bug 反馈
- Windows 实机使用反馈
- 文档改进与 UI 细节优化
- 扫描、搜索和边界情况测试

> 💡 **提示：** 较大的改动建议先开 Issue 进行讨论。

## 📄 License

This project is licensed under the **MIT License**.
See the  [LICENSE](./LICENSE) file for details.
