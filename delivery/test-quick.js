/**
 * Gateway 分层协议 - 快速测试脚本
 */

const { MainGateway } = require('./dist/main-gateway');
const { AuxiliaryGateway } = require('./dist/auxiliary-gateway');

async function test() {
  console.log('='.repeat(50));
  console.log('  Gateway 分层协议 - 快速测试');
  console.log('='.repeat(50));
  
  // 创建主网关
  const mainGateway = MainGateway.create({
    gatewayId: 'gw-main-001',
    port: 18789,
    managementPort: 18790,
  });
  
  // 注册事件处理器
  mainGateway.on('gateway:register', ({ gatewayId, gatewayRole }) => {
    console.log(`[主网关] 网关注册：${gatewayId} (${gatewayRole})`);
  });
  
  mainGateway.on('task:dispatch', (message) => {
    console.log(`[主网关] 任务下发：${message.taskId}`);
  });
  
  mainGateway.on('task:result', ({ taskId, status }) => {
    console.log(`[主网关] 任务结果：${taskId} (${status})`);
  });
  
  // 启动主网关
  console.log('\n[测试] 启动主网关...');
  await mainGateway.start();
  console.log('[主网关] 启动成功');
  
  // 创建辅网关
  const auxGateway = AuxiliaryGateway.create({
    gatewayId: 'gw-auxiliary-001',
    port: 18789,
    mainGatewayUrl: 'ws://localhost:18790',
    mainGatewayToken: 'test-token',
  });
  
  // 注册事件处理器
  auxGateway.on('task:received', ({ taskId, agentId, command }) => {
    console.log(`[辅网关] 收到任务：${taskId} (${agentId}/${command})`);
    
    // 模拟任务执行
    setTimeout(async () => {
      await auxGateway.sendTaskResult(taskId, {
        status: 'success',
        output: `任务 ${taskId} 执行完成`,
        duration: 120,
      });
    }, 1000);
  });
  
  // 启动辅网关
  console.log('\n[测试] 启动辅网关...');
  await auxGateway.start();
  console.log('[辅网关] 启动成功');
  
  // 等待连接
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试任务下发
  console.log('\n[测试] 下发任务...');
  await mainGateway.dispatchTask('gw-auxiliary-001', {
    taskId: 'task-test-001',
    agentId: 'dev',
    command: 'code-review',
    params: { repo: 'opencloud-migration' },
  });
  
  // 等待任务完成
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 测试广播
  console.log('\n[测试] 广播任务...');
  await mainGateway.broadcastTask({
    taskId: 'task-broadcast-001',
    agentId: 'main',
    command: 'status-report',
  });
  
  // 等待
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 停止
  console.log('\n[测试] 停止网关...');
  await auxGateway.stop();
  await mainGateway.stop();
  console.log('[测试] 完成');
  
  process.exit(0);
}

// 运行测试
test().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
