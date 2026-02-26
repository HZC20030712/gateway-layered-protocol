# Gateway 分层协议 - 开发计划

**版本：** v1.0.0  
**创建日期：** 2026-02-26  
**负责人：** dev（开发总工）  
**项目路径：** E:\桌面\OpenCloud-Migration-Project\projects\02-Gateway 分层协议\delivery

---

## 📊 项目现状评估

### 已完成模块 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| 核心网关类 (Gateway) | ✅ 完成 | 支持主/辅网关角色切换 |
| 主网关入口 (MainGateway) | ✅ 完成 | CLI 启动、事件处理 |
| 辅网关入口 (AuxiliaryGateway) | ✅ 完成 | CLI 启动、自动重连 |
| 协议类型定义 (types.ts) | ✅ 完成 | 完整的消息类型定义 |
| 消息构建器 (messages.ts) | ✅ 完成 | 消息构建 + 验证器 |
| 基础 WebSocket 通信 | ✅ 完成 | 注册、心跳、任务下发 |
| IP 白名单（基础版） | ⚠️ 部分完成 | 实现不安全，需加固 |

### 缺失模块 ❌

| 模块 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| Token 认证机制 | P0 | 2h | 完全缺失，高危漏洞 |
| WSS 加密连接 | P0 | 4h | 明文传输，高危漏洞 |
| IP 白名单加固 | P1 | 2h | 支持 CIDR、IPv6、代理 |
| 消息签名验证 | P1 | 3h | HMAC-SHA256 完整性校验 |
| 审计日志系统 | P2 | 4h | 安全事件记录 |
| 速率限制 | P2 | 2h | 防 DDOS、防暴力破解 |
| 设备指纹验证 | P2 | 2h | 设备身份绑定 |
| 管理 API 接口 | P3 | 4h | RESTful 管理接口 |
| Web 管理界面 | P3 | 8h | React 可视化界面 |

---

## 🎯 开发目标

### 安全目标
- [ ] 实现完整的 Token 认证机制（JWT + 刷新）
- [ ] 启用 WSS 加密传输（TLS 1.3）
- [ ] 实现消息签名验证（HMAC-SHA256）
- [ ] 建立审计日志系统（安全事件可追溯）

### 功能目标
- [ ] 支持主网关统一指挥
- [ ] 支持辅网关分布式执行
- [ ] 支持分支节点多级路由
- [ ] 提供管理 API 和 Web 界面

### 性能目标
- [ ] 单主网关支持 100+ 辅网关连接
- [ ] 心跳延迟 < 100ms
- [ ] 任务下发延迟 < 500ms

---

## 📋 开发任务分解

### P0: Token 认证 + WSS 加密（立即执行）

#### 任务 1.1: Token 认证机制
**负责人：** dev  
**预计时间：** 2h  
**截止日期：** 2026-02-26 14:00

**工作内容：**
1. 生成主网关 Token（环境变量或配置文件）
2. 修改 WebSocket 握手头验证逻辑
3. 添加 Token 刷新机制（可选 JWT）
4. 编写单元测试

**代码修改：**
- `src/gateway.ts` - handleMainGatewayConnection()
- `src/protocol/types.ts` - 添加 token 字段（可选）
- `src/config.ts` - 新增配置文件读取
- `.env.example` - 环境变量模板

**测试用例：**
```bash
# 无 Token 连接应被拒绝
wscat -c ws://localhost:18790
# 预期：4001 Unauthorized

# 有效 Token 连接应成功
wscat -c ws://localhost:18790 -H "Authorization: Bearer <token>"
# 预期：连接成功
```

---

#### 任务 1.2: WSS 加密连接
**负责人：** dev  
**预计时间：** 4h  
**截止日期：** 2026-02-26 18:00

**工作内容：**
1. 生成自签名 SSL 证书（开发环境）
2. 创建 HTTPS 服务器包装 WebSocket
3. 修改辅网关使用 wss:// 连接
4. 添加证书配置选项

**代码修改：**
- `src/gateway.ts` - startMainGateway() 改用 HTTPS
- `src/gateway.ts` - startAuxiliaryGateway() 改用 wss://
- `certs/` - 新增证书目录
- `scripts/generate-cert.sh` - 证书生成脚本

**测试用例：**
```bash
# 验证 SSL 证书
openssl s_client -connect localhost:18790 -showcerts

# 加密连接测试
wscat -c wss://localhost:18790
# 预期：SSL 握手成功
```

---

### P1: IP 白名单加固 + 消息签名（24 小时内）

#### 任务 2.1: IP 白名单加固
**负责人：** dev  
**预计时间：** 2h  
**截止日期：** 2026-02-27 10:00

**工作内容：**
1. 支持 CIDR 格式（192.168.1.0/24）
2. 处理 IPv6 映射地址
3. 支持 X-Forwarded-For 代理场景
4. 添加 IP 黑名单功能

**代码修改：**
- `src/gateway.ts` - 重构 IP 验证逻辑
- `src/utils/ip-validator.ts` - 新增工具类
- `src/config.ts` - 支持 CIDR 配置

**测试用例：**
```typescript
// CIDR 验证测试
isIPInCIDR('192.168.1.100', '192.168.1.0/24') // true
isIPInCIDR('192.168.2.100', '192.168.1.0/24') // false

// IPv6 映射测试
normalizeIP('::ffff:192.168.1.100') // '192.168.1.100'
```

---

#### 任务 2.2: 消息签名验证
**负责人：** dev  
**预计时间：** 3h  
**截止日期：** 2026-02-27 14:00

**工作内容：**
1. 实现 HMAC-SHA256 签名算法
2. 在消息头添加 signature 字段
3. 接收方验证签名完整性
4. 添加签名密钥轮换机制

**代码修改：**
- `src/utils/signature.ts` - 新增签名工具类
- `src/protocol/types.ts` - 添加 signature 字段
- `src/gateway.ts` - 发送时签名、接收时验证

**测试用例：**
```typescript
// 签名验证测试
const msg = { type: 'test', data: 'hello' };
const sig = signMessage(msg, 'secret');
verifySignature(msg, sig, 'secret') // true
verifySignature(msg, sig, 'wrong') // false
```

---

### P2: 审计日志 + 速率限制（本周内）

#### 任务 3.1: 审计日志系统
**负责人：** dev + ops  
**预计时间：** 4h  
**截止日期：** 2026-02-28 18:00

**工作内容：**
1. 定义审计事件类型（注册、心跳、任务、错误）
2. 实现日志写入（文件 + 可选数据库）
3. 添加日志轮转（按大小/时间）
4. 提供日志查询接口

**代码修改：**
- `src/utils/audit-logger.ts` - 新增审计日志类
- `src/gateway.ts` - 关键操作记录日志
- `logs/` - 新增日志目录
- `src/api/logs.ts` - 日志查询 API（可选）

**日志格式：**
```json
{
  "timestamp": "2026-02-26T10:30:00Z",
  "event": "gateway.register",
  "level": "info",
  "gatewayId": "gw-aux-001",
  "ip": "192.168.1.100",
  "details": { "status": "success" }
}
```

---

#### 任务 3.2: 速率限制
**负责人：** dev  
**预计时间：** 2h  
**截止日期：** 2026-02-28 20:00

**工作内容：**
1. 实现令牌桶算法
2. 限制注册频率（防暴力破解）
3. 限制心跳频率（防 DDOS）
4. 限制任务下发频率

**代码修改：**
- `src/utils/rate-limiter.ts` - 新增限流器
- `src/gateway.ts` - 在关键路径应用限流

**配置示例：**
```json
{
  "rateLimit": {
    "register": { "windowMs": 60000, "max": 10 },
    "heartbeat": { "windowMs": 10000, "max": 5 },
    "taskDispatch": { "windowMs": 1000, "max": 100 }
  }
}
```

---

### P3: 管理 API + Web 界面（下周）

#### 任务 4.1: 管理 API 接口
**负责人：** dev  
**预计时间：** 4h  
**截止日期：** 2026-03-02 18:00

**API 端点：**
```
GET  /api/status          - 网关状态
GET  /api/gateways        - 已连接网关列表
POST /api/task/dispatch   - 下发任务
GET  /api/logs            - 审计日志
POST /api/config/reload   - 重载配置
```

**代码修改：**
- `src/api/server.ts` - 新增 Express 服务器
- `src/api/routes/*.ts` - 路由处理器

---

#### 任务 4.2: Web 管理界面
**负责人：** design + dev  
**预计时间：** 8h  
**截止日期：** 2026-03-03 18:00

**功能模块：**
- 网关状态仪表盘
- 连接网关列表
- 任务下发界面
- 日志查看器
- 配置管理

**技术栈：**
- React + Vite（已有）
- Ant Design / Material UI
- WebSocket 实时连接

---

## 📅 时间表

| 阶段 | 任务 | 开始时间 | 结束时间 | 负责人 |
|------|------|----------|----------|--------|
| P0 | Token 认证 | 2026-02-26 10:00 | 2026-02-26 14:00 | dev |
| P0 | WSS 加密 | 2026-02-26 14:00 | 2026-02-26 18:00 | dev |
| P0 小计 | - | - | **4h** | - |
| P1 | IP 白名单加固 | 2026-02-27 08:00 | 2026-02-27 10:00 | dev |
| P1 | 消息签名 | 2026-02-27 10:00 | 2026-02-27 14:00 | dev |
| P1 小计 | - | - | **6h** | - |
| P2 | 审计日志 | 2026-02-28 14:00 | 2026-02-28 18:00 | dev + ops |
| P2 | 速率限制 | 2026-02-28 18:00 | 2026-02-28 20:00 | dev |
| P2 小计 | - | - | **6h** | - |
| P3 | 管理 API | 2026-03-02 14:00 | 2026-03-02 18:00 | dev |
| P3 | Web 界面 | 2026-03-03 10:00 | 2026-03-03 18:00 | design + dev |
| P3 小计 | - | - | **12h** | - |

**总计工作量：** 28 小时（约 3.5 个工作日）

---

## 👥 团队协作

### dev（开发总工）
- 负责所有核心代码开发
- 编写单元测试
- 代码审查

### security（安全总监）
- 安全审计（已完成）
- 修复后复验
- 渗透测试

### ops（运维总监）
- 部署脚本编写
- 监控告警配置
- 日志系统对接

### design（设计总监）
- Web 界面设计
- UI/UX 优化

---

## 🧪 测试验证计划

### 单元测试
```bash
npm test
# 覆盖率目标：>80%
```

### 集成测试
1. 主网关启动测试
2. 辅网关注册测试
3. 任务下发 - 执行 - 结果全流程测试
4. 断线重连测试

### 安全测试
1. 无 Token 连接拒绝测试
2. 无效 Token 拒绝测试
3. IP 白名单生效测试
4. 消息篡改检测测试
5. WSS 加密验证测试

### 性能测试
```bash
# 使用 autocannon 压测
autocannon -c 100 -d 30 http://localhost:18790
```

---

## 📦 交付物

1. **代码**
   - `src/gateway.ts` - 安全加固版
   - `src/utils/*.ts` - 新增工具类
   - `src/config.ts` - 配置管理
   - `certs/` - SSL 证书

2. **文档**
   - `docs/SECURITY_AUDIT.md` - 安全审计报告（已有）
   - `docs/DEVELOPMENT_PLAN.md` - 开发计划（本文档）
   - `docs/API.md` - API 文档（待写）
   - `docs/DEPLOYMENT.md` - 部署指南（待写）

3. **配置**
   - `.env.example` - 环境变量模板
   - `config.default.json` - 默认配置

4. **脚本**
   - `scripts/generate-cert.sh` - 证书生成
   - `scripts/deploy.sh` - 部署脚本

---

## ⚠️ 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| SSL 证书配置复杂 | 中 | 使用 Let's Encrypt 自动化 |
| Token 管理泄露 | 高 | 环境变量 + 密钥轮换 |
| 性能下降 | 中 | 加密开销 <10%，可接受 |
| 兼容性问题 | 低 | 提供 ws/wss 双模式 |

---

## ✅ 验收标准

### P0 验收（必须完成）
- [ ] 无 Token 连接被拒绝
- [ ] 有效 Token 连接成功
- [ ] WSS 加密连接建立
- [ ] SSL 证书有效

### P1 验收（重要）
- [ ] IP 白名单（CIDR）生效
- [ ] 非法 IP 被拒绝
- [ ] 消息签名验证通过
- [ ] 篡改消息被检测

### P2 验收（推荐）
- [ ] 安全事件记录日志
- [ ] 日志可查询
- [ ] 速率限制生效
- [ ] 超限请求被拒绝

---

**创建时间：** 2026-02-26 10:30  
**下次更新：** 每日站会同步进度  
**审批人：** main（大管家）

---

## 📞 协作方式

需要协作时使用 sessions_send 工具：
- 让 security 复验 → sessions_send agentId: "security"
- 让 ops 部署 → sessions_send agentId: "ops"
- 让 design 设计 UI → sessions_send agentId: "design"
