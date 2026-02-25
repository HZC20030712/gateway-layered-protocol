# Gateway Layered Protocol

**主网关统一指挥，辅网关分布式执行 — 跨域 Agent 团队联调工具**

---

## 🚀 5 分钟快速开始

### 安装

```bash
npm install
```

### 启动主网关

```bash
npm run dev:main
```

### 启动辅网关（新终端）

```bash
npm run dev:aux
```

### 测试

```bash
npm test
```

---

## 🏗️ 架构

```
主网关 (18789+18790)
    ↓
辅网关 A → 任务执行
辅网关 B → 任务执行
辅网关 C → 任务执行
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

- [TOP-LEVEL-PLAN.md](TOP-LEVEL-PLAN.md) - 顶层方案
- [QUICKSTART.md](QUICKSTART.md) - 快速开始

---

**版本**: v1.0.0  
**License**: MIT
