---
name: project-wide-unit-test-coverage
description: 为 NoirsToo (DragonFill) 项目系统性地补齐全项目单元测试与页面级测试覆盖，按 core logic -> composables -> components 的顺序推进，并在每轮修改后执行类型检查与 lint。
---

# Project-wide Unit Test Coverage (NoirsToo / DragonFill)

## Use When
在以下场景使用这个 skill：

- 需要为整个浏览器扩展项目 (NoirsToo) 补齐单元测试覆盖。
- 需要系统性提高覆盖率，而不是零散补测。
- 需要按模块的职责分层推进测试：
  - 第一层：`utils/*` 和核心业务逻辑 (e.g. 填表算法、数据解析)。
  - 第二层：`composables/` (若有) 或其他跨组件组合式应用。
  - 第三层：`components/*` (如 `EmotionalStatus`, `FluidBackground` 等高级 WebGL 组件)。
  - 第四层：`entrypoints/` 核心脚本 (`background.ts`, `content.ts`) 的核心方法。
- 需要在改动后利用项目中预置的 npm/bun scripts 进行统一验证：
  - `bun run compile` (即 vue-tsc --noEmit)
  - `bun run lint` (即 eslint .)
  - `bun run test` (即 vitest run)

## Goals
本 project 并不一味机械追求 `100% coverage`，其核心心法包含：

1. **先覆盖扩展权限侧和高风险业务路径** (如 Clipboard、Storage 操作)。
2. **保护复杂的渲染交互**：尤其是你在开发具有高度物理动效/WebGL 着色器组件时的核心参数校验边界。
3. **保持测试、类型与 Lint 持续可用**。

## Core Principles

### 1. 先测高价值（扩展引擎特有），不先刷数字
优先覆盖：
- Service worker / content script 中对于 DOM 解析与自动填充的具体逻辑链路。
- **Bio-Digital Fusion (人机融合)**：比如表单情绪捕获、动态光效（Shader 流体模拟、GSAP）相关的纯数据状态转移逻辑。
- Messaging 管道的健全性：组件向 background 或 content 的双向 RPC 调用。
- WXT `storage` 处理逻辑。

不优先覆盖：
- 纯样式与极其细微的 CSS 变量计算（可在组件快照中一次性涵盖）。
- WXT / Vue 3 / Three.js 框架自身的行为验证。

### 2. 固定的分层执行与推进顺序
按以下顺序推进，防止依赖树下方的修改反破上方的断言（自底向上）：

1. **`utils/*` & `lib/*`** 
   * 原因：基础工具、Shader 常数函数、噪音库、数据修饰。决定了上层能否运作。
2. **`components/*`** 
   * 原因：诸如 `LevitatingButton` 或 `MoodInput`，保证数据被正确的渲染和触网响应。
3. **`entrypoints/background.ts` & `entrypoints/content.ts`** 
   * 原因：组装件。验证与浏览器的核心交互（如监听 tab、权限调用）不出错。

### 3. 单轮修改后必须执行验证
每完成一批维度的测试修改，**必须**执行如下脚手架命令进行验证。
（此项目基于 Bun/Vue/WXT，命令流如下：）

```bash
bun run compile
bun run lint
bun run test
```

只有当终端返回了完整的 Green 绿灯后，才能进入下一轮或声明阶段成果。
