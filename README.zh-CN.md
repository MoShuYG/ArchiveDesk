> [!IMPORTANT]
> 此代码完全由 AI 编写。

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a>
</p>

# ArchiveDesk

<!-- [![banner](_docs/img/banner.svg)](https://github.com/YOUR_USERNAME/ArchiveDesk) -->

[![Release](https://img.shields.io/github/release/MoShuYG/ArchiveDesk.svg)](https://github.com/MoShuYG/ArchiveDesk/releases)
[![Download](https://img.shields.io/github/downloads/MoShuYG/ArchiveDesk/total.svg)](https://github.com/MoShuYG/ArchiveDesk/releases)
[![License](https://img.shields.io/github/license/MoShuYG/ArchiveDesk.svg)](https://github.com/MoShuYG/ArchiveDesk/master/LICENSE)
[![Windows](https://img.shields.io/badge/platform-Windows-blue?logo=windows)](https://github.com/MoShuYG/ArchiveDesk/releases)


## 🚀 简介

ArchiveDesk 是一款用于本地使用的数字档案管理工具，基于 `React` + `Express` + `SQLite` 构建，主要面向 Windows 桌面环境。它适合长期整理和检索本机上的图片、视频、音频及文档等文件，并支持离线工作流。

### ✨ 特性

- 📁 创建和管理本地资源库
- 🔍 目录扫描与索引
- 🏷️ 关键词搜索
- 📋 资源浏览与详情查看
- 🚀 调用外部程序打开文件
- 🔒 本地运行，支持离线使用

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

从 [GitHub Releases](https://github.com/MoShuYG/ArchiveDesk/releases) 下载正式版压缩包，解压到本地目录，按压缩包内说明运行即可。

如需从源码运行，请参考下方 [开发](#-开发) 部分。

<!-- ## 🖼️ 界面预览 -->

<!-- ![](_docs/img/ui-demo.png) -->

## 🎯 适用场景

- 集中处理和检索选定文件夹的图片、视频、音频及文档
- 建立个人资料库、创作素材库或数字档案
- 本地使用

## 🗂️ 适用文件格式

ArchiveDesk 会扫描并索引选定文件夹中的文件。以下格式支持在应用内直接预览：

| 类别 | 格式 |
|------|------|
| 图片 | JPG / JPEG / PNG / GIF / WebP / BMP / AVIF |
| 视频 | MP4 / MOV / WebM |
| 音频 | MP3 / WAV / FLAC / M4A / AAC / OGG |
| 文本 | TXT / MD / JSON / CSV |
| 文档 | DOCX |

音视频文件能否正常播放，还取决于浏览器对文件编码的支持。其他格式也可以通过 Windows 默认软件打开。

## 👨‍💻 开发

### 🌍 环境要求

1. Windows 10 / 11
2. Node.js 22.x
3. npm（随 Node.js 安装）

### 📋 克隆

```bash
git clone https://github.com/MoShuYG/ArchiveDesk.git
cd ArchiveDesk
```

### 📦 安装依赖

在项目根目录执行：

```bash
npm install
npm --prefix frontend install
```

首次运行前，在 PowerShell 中复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

### 🚀 启动开发环境

分别打开两个终端：

```bash
# 后端：http://localhost:3000
npm run dev

# 前端：http://localhost:5173
npm --prefix frontend run dev
```

如需体验由后端托管前端资源的本地生产模式，可直接运行：

```powershell
.\start-dev.bat
```

脚本会先清理并重新构建前后端，然后通过 `http://localhost:3000` 启动应用。

### ⚙️ 配置

参考根目录中的 `.env.example`，常用配置项：

| 变量 | 说明 |
|------|------|
| `PORT` | 后端端口 |
| `DB_PATH` | 数据库路径 |
| `JWT_ACCESS_SECRET` | JWT Access Token 密钥 |
| `JWT_REFRESH_SECRET` | JWT Refresh Token 密钥 |
| `CORS_ORIGIN` | 跨域来源 |

### 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 7 |
| 界面与状态 | Tailwind CSS 3 + React Router 7 + Zustand 5 |
| 后端 | Express 4 + TypeScript |
| 数据库 | SQLite + better-sqlite3 |
| 文档预览 | PDF.js + Mammoth |
| 图片与媒体元数据 | Sharp + ffprobe |
| 身份验证与安全 | JWT + Argon2 + Helmet |

### 📋 常用命令

```bash
npm run dev            # 启动后端开发服务
npm run build          # 构建后端
npm run build:frontend # 构建前端
npm run build:all      # 构建前后端
npm test               # 运行测试
npm run lint           # 后端类型检查
npm run lint:frontend  # 前端 Lint 检查
npm run release:check  # 完整发版检查
```

## 🤝 贡献

如果你在使用中发现问题，或对功能和体验有新的想法，欢迎通过 Issue 告诉我们；如果愿意动手改进，也欢迎提交 Pull Request。无论是修复 Bug、完善文档、打磨界面，还是补充扫描、搜索和预览相关测试，都能让 ArchiveDesk 变得更好。

准备进行较大的改动时，建议先开一个 Issue 聊聊思路，方便提前确认方向，也能减少重复工作。更多说明请参阅 [贡献指南](CONTRIBUTING.zh-CN.md)。

## 📄 License

[MIT](LICENSE)
