# ✨ Aura JSON Studio

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-4fb17a?style=for-the-badge)

</div>

[English](#english) | [中文](#中文)

---

<a name="english"></a>

## 🌟 Overview

**Aura JSON Studio** is a premium, professional-grade JSON workbench designed for developers who value both productivity and aesthetics. It’s not just a formatter; it’s a high-performance laboratory for inspecting, repairing, and cleaning your JSON data.

Built with **Next.js 15**, **React 19**, and a zero-dependency custom syntax engine.

### 🚀 Key Features

- **🎨 Dribbble-Grade UI**: A stunning dark-mode aesthetic featuring glassmorphism, fluid animations, and premium typography.
- **🪄 Intelligent Auto-Fix**: A heuristic regex-based engine that repairs common JSON syntax errors in real-time (missing quotes, unclosed strings, trailing commas, Chinese quotes, etc.).
- **🌈 Rainbow Brackets**: Instantly visualize nesting levels with depth-aware color-coded brackets.
- **🛡️ Invisible Char Cleanup**: Automatically detects and strips high-risk hidden characters like BOM, zero-width spaces, and non-breaking spaces.
- **⚡ Zero-Dependency Syntax Highlighting**: High-speed highlighting implemented with custom lexical scanning—no heavy libraries like Monaco or Prism.
- **🔍 Granular Inspection**: A minimalist tree view that supports:
  - **Copy Value**: Quick extraction of node values.
  - **Copy JSON Path**: Copy absolute paths (e.g., `$.user.locales[0]`) for debugging.
- **🎚️ Adaptive Workspace**: A draggable resizer to balance your input and output views.

### 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Styling**: Vanilla CSS (Premium Design System)
- **Language**: TypeScript 5

---

<a name="中文"></a>

## 🌟 项目简介

**Aura JSON Studio** 是一款为追求极致生产力与审美体验的开发者打造的专业级 JSON 工作台。它不仅仅是一个格式化工具，更是一个集成了智能修复、深度自检与隐形字符清理的高性能数据实验室。

基于 **Next.js 15**、**React 19** 构建，并搭载了自研的零依赖语法高亮引擎。

### 🚀 核心特性

- **🎨 顶级视觉体验**: 采用 Dribbble 风格的暗黑长毛玻璃美学设计，支持动态流体动画与极致的排版优化。
- **🪄 智能一键修复 (Auto-Fix)**: 内置基于启发式正则算法的修复引擎，秒级修正缺失引号、未闭合字符串、尾随逗号、中文全角引号等常见语法错误。
- **🌈 彩虹嵌套括号**: 自动感知数据深度，通过不同颜色实时展现嵌套关系，复杂结构一目了然。
- **🛡️ 零隐患清理**: 深度探测并强制剥离 BOM、零宽空格、不换行空格等各类肉眼不可见的高危字符。
- **⚡ 超轻量语法高亮**: 纯手工实现的词法扫描机制，通过双层拓扑渲染实现高性能高亮效果，告别数 MB 级的沉重第三方库。
- **🔍 精细化数据巡检**: 极简树形视图支持：
  - **复制原始值**: 快速提取节点数据。
  - **复制 JSON 路径**: 直接生成 JSONPath（如 `$.data.list[0].id`），联调排错神器。
- **🎚️ 响应式布局**: 支持中央分栏左右拖拽，灵活调整输入与输出区的比例。

### 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **组件库**: React 19
- **样式**: 原生 CSS (定制化设计系统)
- **语言**: TypeScript 5

---

### 📦 Quick Start / 快速开始

```bash
# Install dependencies / 安装依赖
npm install

# Run development server / 启动开发环境
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start your JSON journey.
访问 [http://localhost:3000](http://localhost:3000) 开启极致 JSON 体验。
