# Gateway Layered Protocol

**主网关统一指挥，辅网关分布式执行 — 跨域 Agent 团队联调工具**

**GitHub**: https://github.com/HZC20030712/gateway-layered-protocol

---

## 🎯 5 分钟上手

### 1. 安装

```bash
cd delivery
npm install
```

### 2. 启动主网关（终端 1）

```bash
npm run dev:main
```

### 3. 启动辅网关（终端 2）

```bash
npm run dev:aux
```

### 4. 打开 Web 管理界面（浏览器）

```
http://localhost:5173
```

### 5. 发送任务

在 Web UI 中选择网关 → 选择 Agent → 发送任务

---

## 🏗️ 架构

```
┌─────────────────────────────────────────┐
│     主网关 (18789+18790) + Web UI       │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   ┌────────┐  ┌────────┐  ┌────────┐
   │ 辅网关 A│  │ 辅网关 B│  │ 辅网关 C│
   │ 任务执行│  │ 任务执行│  │ 任务执行│
   └────────┘  └────────┘  └────────┘
```

---

## 📦 核心功能

| 功能 | 状态 |
|------|------|
| 网关注册 | ✅ |
| 心跳保活 | ✅ |
| 任务下发 | ✅ |
| 任务广播 | ✅ |
| 结果返回 | ✅ |
| Web UI | ✅ |

---

## 📄 文档

| 文档 | 说明 |
|------|------|
| [TUTORIAL.md](TUTORIAL.md) | 📘 **使用教程（必读）** |
| [QUICKSTART.md](QUICKSTART.md) | ⚡ 快速开始 |
| [TOP-LEVEL-PLAN.md](TOP-LEVEL-PLAN.md) | 📋 顶层方案 |

---

## 🧪 测试

```bash
npm test
```

---

## 👥 8 人团队协作

| 角色 | 职责 |
|------|------|
| main | 总调度 + 测试监管 |
| dev | 后端开发 |
| design | 前端 UI |
| ops | 部署运维 |
| security | 安全审计 |
| content | 文档完善 |
| growth | 性能优化 |
| finance | 成本评估 |

---

**版本**: v1.0.0  
**License**: MIT  
**Created**: 2026-02-26
