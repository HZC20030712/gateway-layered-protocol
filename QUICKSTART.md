# 快速开始

## 安装依赖

```bash
cd delivery
npm install
```

## 启动主网关

```bash
npm run dev:main
```

输出：
```
==================================================
  Gateway 分层协议 - 主网关
==================================================
网关 ID: gw-main-001
监听端口：18789
管理端口：18790
==================================================
[Gateway] 启动 main 网关 (gw-main-001)
[MainGateway] 监听端口 18790
[Gateway] 网关启动成功
```

## 启动辅网关（新终端）

```bash
npm run dev:aux
```

输出：
```
[Gateway] 启动 auxiliary 网关 (gw-auxiliary-001)
[AuxGateway] 已连接到主网关：ws://localhost:18790
[AuxGateway] 注册成功：gw-auxiliary-001
```

## 运行测试

```bash
npm test
```

## 使用 API

### 主网关

```typescript
import { MainGateway } from './main-gateway';

const main = MainGateway.create({
  gatewayId: 'gw-main-001',
  port: 18789,
  managementPort: 18790,
});

// 下发任务
await main.dispatchTask('gw-auxiliary-001', {
  taskId: 'task-001',
  agentId: 'dev',
  command: 'code-review',
  params: { repo: 'my-repo' },
});

// 广播任务
await main.broadcastTask({
  taskId: 'task-002',
  agentId: 'main',
  command: 'status-report',
});
```

### 辅网关

```typescript
import { AuxiliaryGateway } from './auxiliary-gateway';

const aux = AuxiliaryGateway.create({
  gatewayId: 'gw-auxiliary-001',
  port: 18789,
  mainGatewayUrl: 'ws://localhost:18790',
  mainGatewayToken: 'your-token',
});

// 监听任务
aux.on('task:received', async ({ taskId, agentId, command, params }) => {
  console.log(`收到任务：${taskId}`);
  
  // 执行任务...
  
  // 返回结果
  await aux.sendTaskResult(taskId, {
    status: 'success',
    output: '任务完成',
    duration: 120,
  });
});
```

---

**就这么简单！** 🎉
