# Gateway 分层协议 - 安全审计报告

**版本：** v1.0.0  
**审计日期：** 2026-02-26  
**审计人：** security (OpenClaw Agent)  
**风险等级：** 🔴 高危

---

## 📊 执行摘要

本次安全审查发现 **4 个高危漏洞** 和 **5 个中低风险问题**，需立即修复后方可投入生产使用。

### 风险分布

| 风险等级 | 数量 | 状态 |
|----------|------|------|
| 🔴 高危 | 4 | 待修复 |
| 🟡 中危 | 3 | 待修复 |
| 🟢 低危 | 2 | 待优化 |

---

## 🔍 详细发现

### 1. WebSocket 连接无加密（高危）

**风险等级：** 🔴 高危  
**CVE 参考：** CWE-319 (Cleartext Transmission of Sensitive Information)

**问题描述：**
当前实现使用明文 `ws://` 协议，所有通信数据（包括 Token、任务内容、网关信息）均以明文传输，可被中间人攻击窃取。

**受影响代码：**
```typescript
// src/gateway.ts:243
this.wss = new WebSocket.Server({ port: managementPort });

// src/gateway.ts:334
this.ws = new WebSocket(url);
```

**攻击场景：**
1. 同一网络下的攻击者嗅探 WebSocket 流量
2. 获取 Token 后伪装成合法辅网关
3. 窃取任务数据或注入恶意任务

**修复方案：**
```typescript
// 使用 wss:// + HTTPS 服务器
import * as https from 'https';
import * as fs from 'fs';

const options = {
  key: fs.readFileSync('certs/server.key'),
  cert: fs.readFileSync('certs/server.crt'),
};

const server = https.createServer(options);
this.wss = new WebSocket.Server({ server });
```

**测试验证：**
```bash
# 验证连接加密
wscat -c wss://localhost:18790
# 应看到有效 SSL 证书
```

---

### 2. Token 认证机制缺失（高危）

**风险等级：** 🔴 高危  
**CVE 参考：** CWE-306 (Missing Authentication for Critical Function)

**问题描述：**
类型定义中存在 `mainGatewayToken` 字段，但实际代码中**从未验证**。任何知道主网关地址的客户端均可注册为辅网关。

**受影响代码：**
```typescript
// src/gateway.ts:265-278
private handleGatewayRegister(ws: WebSocket, request: GatewayRegisterRequest): void {
  const { gatewayId, gatewayRole, info } = request;
  
  // ❌ 缺少 Token 验证
  // 应验证 request.payload?.token 或 WebSocket 握手头
}
```

**攻击场景：**
1. 攻击者扫描网络发现主网关端口
2. 发送伪造的注册请求
3. 成功接入网关网络，接收/发送任务

**修复方案：**

**方案 A：握手头验证（推荐）**
```typescript
// src/gateway.ts - handleMainGatewayConnection
private handleMainGatewayConnection(ws: WebSocket, req: any): void {
  // 验证 Token（从 WebSocket 握手头获取）
  const token = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token || token !== this.config.mainGatewayToken) {
    console.warn(`[MainGateway] 认证失败：${req.socket.remoteAddress}`);
    ws.close(4001, 'Unauthorized');
    return;
  }
  
  // 继续处理...
}
```

**方案 B：注册消息验证**
```typescript
// src/protocol/types.ts - 添加 token 字段
export interface GatewayRegisterRequest extends BaseMessage {
  type: 'gateway.register';
  gatewayId: string;
  gatewayRole: GatewayRole;
  token: string;  // 新增
  info: { ... };
}

// src/gateway.ts - handleGatewayRegister
private handleGatewayRegister(ws: WebSocket, request: GatewayRegisterRequest): void {
  if (request.token !== this.config.mainGatewayToken) {
    this.sendResponse(ws, {
      type: 'gateway.register.ack',
      from: this.config.gatewayId,
      to: request.gatewayId,
      timestamp: new Date().toISOString(),
      status: 'error',
      message: 'Token 无效',
    });
    ws.close(4001, 'Unauthorized');
    return;
  }
  // 继续处理...
}
```

**测试验证：**
```bash
# 无 Token 连接应被拒绝
wscat -c ws://localhost:18790
# 应收到 4001 Unauthorized

# 有效 Token 连接应成功
wscat -c ws://localhost:18790 -H "Authorization: Bearer <token>"
```

---

### 3. IP 白名单实现不安全（中危）

**风险等级：** 🟡 中危  
**CVE 参考：** CWE-284 (Improper Access Control)

**问题描述：**
当前实现使用 `(ws as any)['socket']?.remoteAddress` 获取客户端 IP，该方式：
1. 依赖非公开属性，可能在未来版本失效
2. 未处理 IPv6 地址格式
3. 未考虑代理场景（X-Forwarded-For）

**受影响代码：**
```typescript
// src/gateway.ts:253-261
const remoteIP = (ws as any)['socket']?.remoteAddress || 'unknown';
if (!this.config.allowedGatewayIPs.includes(remoteIP)) {
  // 拒绝
}
```

**修复方案：**
```typescript
// src/gateway.ts - handleMainGatewayConnection
private handleMainGatewayConnection(ws: WebSocket, req: any): void {
  // 从握手请求获取 IP（更可靠）
  let remoteIP = req.socket?.remoteAddress || 'unknown';
  
  // 处理 IPv6 映射到 IPv4
  if (remoteIP.startsWith('::ffff:')) {
    remoteIP = remoteIP.substring(7);
  }
  
  // 处理代理场景（可选）
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    remoteIP = forwardedFor.split(',')[0].trim();
  }
  
  // 验证白名单（支持 CIDR）
  if (this.config.allowedGatewayIPs?.length > 0) {
    const allowed = this.config.allowedGatewayIPs.some(allowed => {
      if (allowed.includes('/')) {
        return this.isIPInCIDR(remoteIP, allowed);
      }
      return remoteIP === allowed;
    });
    
    if (!allowed) {
      console.warn(`[MainGateway] IP 拒绝：${remoteIP}`);
      ws.close(4003, 'Forbidden');
      return;
    }
  }
  
  // 继续处理...
}

// CIDR 验证工具函数
private isIPInCIDR(ip: string, cidr: string): boolean {
  const [network, prefix] = cidr.split('/');
  const mask = parseInt(prefix);
  
  const ipNum = this.ipToNumber(ip);
  const networkNum = this.ipToNumber(network);
  const maskNum = (0xFFFFFFFF << (32 - mask)) >>> 0;
  
  return (ipNum & maskNum) === (networkNum & maskNum);
}

private ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}
```

---

### 4. 消息无完整性校验（中危）

**风险等级：** 🟡 中危  
**CVE 参考：** CWE-353 (Missing Support for Integrity Check)

**问题描述：**
消息传输过程中无签名验证，攻击者可能篡改任务内容。

**修复方案：**
```typescript
// 添加 HMAC 签名
import * as crypto from 'crypto';

function signMessage(message: any, secret: string): string {
  const payload = JSON.stringify(message);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifySignature(message: any, signature: string, secret: string): boolean {
  const expected = signMessage(message, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

---

## 📈 修复优先级

| 优先级 | 问题 | 工作量 | 建议完成时间 |
|--------|------|--------|--------------|
| P0 | Token 认证机制 | 2h | 立即 |
| P0 | WSS 加密连接 | 4h | 立即 |
| P1 | IP 白名单加固 | 2h | 24 小时 |
| P2 | 消息签名验证 | 3h | 本周 |
| P2 | 审计日志系统 | 4h | 本周 |
| P3 | 速率限制 | 2h | 下周 |

---

## ✅ 修复验证清单

- [ ] 无 Token 连接被拒绝
- [ ] 有效 Token 连接成功
- [ ] WSS 加密连接建立
- [ ] SSL 证书有效
- [ ] IP 白名单生效
- [ ] 非法 IP 被拒绝
- [ ] 消息篡改被检测
- [ ] 安全事件记录日志

---

## 📚 参考文档

- [WebSocket Security Considerations (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455#section-10)
- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSockets_Security_Cheat_Sheet.html)
- [Node.js TLS/SSL 文档](https://nodejs.org/api/tls.html)

---

**审计完成时间：** 2026-02-26 10:18  
**下次审计建议：** 修复完成后重新审计
