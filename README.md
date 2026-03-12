# ArchiveDesk

<!-- [![banner](_docs/img/banner.svg)](https://github.com/YOUR_USERNAME/ArchiveDesk) -->

[![Release](https://img.shields.io/github/release/MoShuYG/ArchiveDesk.svg)](https://github.com/MoShuYG/ArchiveDesk/releases)
[![Download](https://img.shields.io/github/downloads/MoShuYG/ArchiveDesk/total.svg)](https://github.com/MoShuYG/ArchiveDesk/releases)
[![License](https://img.shields.io/github/license/MoShuYG/ArchiveDesk.svg)](https://github.com/MoShuYG/ArchiveDesk/master/LICENSE)
[![Windows](https://img.shields.io/badge/platform-Windows-blue?logo=windows)](https://github.com/MoShuYG/ArchiveDesk/releases)


## 🚀 简介

ArchiveDesk，一个本地优先的数字档案管理工具，使用 `React` + `Express` + `SQLite` 构建，面向 Windows 桌面环境。适用于长期整理和检索本地图片、视频、音频、文档等文件，支持离线工作流。

> ⚠️ 当前处于 **Alpha 阶段**（v0.1.0-alpha.1），功能仍在持续完善中。

### ✨ 特性

- 📁 创建和管理本地资源库
- 🔍 目录扫描与索引
- 🏷️ 关键词搜索
- 📋 资源浏览与详情查看
- 🚀 调用外部程序打开文件
- 🔒 本地优先，离线优先

## ⬇️ 下载

<table>
  <tbody>
    <tr>
      <td>🪟 Windows</td>
      <td><code>ZIP</code></td>
      <td>amd64</td>
      <td><a href="https://github.com/MoShuYG/ArchiveDesk/releases">📥</a></td>
    </tr>
  </tbody>
</table>

从 [GitHub Releases](https://github.com/MoShuYG/ArchiveDesk/releases) 下载预览版压缩包，解压到本地目录，按压缩包内说明运行即可。

如需从源码运行，请参考下方 [开发](#-开发) 部分。

<!-- ## 🖼️ 界面预览 -->

<!-- ![](_docs/img/ui-demo.png) -->

## 🎯 适用场景

| ✅ 适合 | ❌ 暂不适合 |
|---------|------------|
| 长期整理本地文件 | 多人协作 |
| 个人数字档案管理 | 云同步场景 |
| 本地优先、离线优先工作流 | 企业级权限与流程管理 |
| Windows 桌面环境 | 成熟的媒体管理体验 |

## 👨‍💻 开发

### 🌍 环境要求

1. Windows 10 / 11
2. Node.js
3. npm

### 📋 克隆

```bash
git clone git@github.com:MoShuYG/ArchiveDesk.git
```

### 🏗️ 构建

#### 后端

```bash
npm install
cp .env.example .env
npm run dev
```

默认地址：`http://localhost:3000`

#### 前端

```bash
cd frontend
npm install
npm run dev
```

默认地址：`http://localhost:5173`

### ⚙️ 配置

参考根目录中的 `.env.example`，常用配置项：

| 变量 | 说明 |
|------|------|
| `PORT` | 后端端口 |
| `DB_PATH` | 数据库路径 |
| `JWT_ACCESS_SECRET` | JWT Access Token 密钥 |
| `JWT_REFRESH_SECRET` | JWT Refresh Token 密钥 |
| `CORS_ORIGIN` | 跨域来源 |
| `QUICKVIEWER_PATH` | 外部查看器路径 |

### 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| Frontend | React + Vite + TypeScript |
| State | Zustand |
| Backend | Express + TypeScript |
| Database | SQLite |
| Auth | JWT |

### 📋 常用命令

```bash
# 根目录
npm run dev          # 启动后端开发服务
npm run build        # 构建
npm test             # 测试
npm run lint         # Lint 检查
npm run release:check # 发版检查（后端构建、测试、前端 lint 与构建）

# 前端目录
cd frontend
npm run dev          # 启动前端开发服务
npm run build        # 构建前端
npm run lint         # 前端 Lint 检查
```

## 📝 路线图

### 近期

- 优化资源库管理流程
- 提高目录扫描稳定性
- 改进搜索与浏览体验
- 补充截图和发行版资产
- 整理文档与项目结构

### 中期

- 更完整的元数据管理
- 更好的预览与查看体验
- 适合长期整理的交互流程
- 更稳定的 Windows 本地桌面体验

## ⚠️ 当前限制

- 项目结构仍在持续调整
- 数据模型后续可能继续演化
- 当前主要面向 Windows
- 发行包形式还不是最终形态
- 不同文件类型的高级体验仍在逐步补齐

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！当前比较适合参与的方向：

- 🐛 Bug 反馈
- 💻 Windows 实机使用反馈
- 📖 文档改进
- 🎨 UI 细节优化
- 🧪 扫描、搜索和边界情况测试

> 较大的改动建议先开 Issue 讨论。

## 📄 License

[MIT](LICENSE)
