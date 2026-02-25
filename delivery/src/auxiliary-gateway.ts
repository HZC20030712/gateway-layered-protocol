/**
 * Gateway 分层协议 - 辅网关入口
 * 版本：v1.0.0
 * 创建：2026-02-26
 */

import { Gateway } from './gateway';
import { GatewayConfig } from './protocol/types';

/**
 * 辅网关配置
 */
interface AuxiliaryGatewayConfig extends GatewayConfig {
  role: 'auxiliary';
  mainGatewayUrl: string;
  mainGatewayToken: string;
}

/**
 * 辅网关类
 */
export class AuxiliaryGateway extends Gateway {
  constructor(config: AuxiliaryGatewayConfig) {
    super(config);
  }

  /**
   * 创建辅网关实例
   */
  static create(config: {
    gatewayId: string;
    port?: number;
    mainGatewayUrl: string;
    mainGatewayToken: string;
  }): AuxiliaryGateway {
    const auxConfig: AuxiliaryGatewayConfig = {
      role: 'auxiliary',
      gatewayId: config.gatewayId || 'gw-auxiliary-001',
      port: config.port || 18789,
      mainGatewayUrl: config.mainGatewayUrl,
      mainGatewayToken: config.mainGatewayToken,
    };

    return new AuxiliaryGateway(auxConfig);
  }
}

// ==================== CLI 入口 ====================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  const gatewayId = args.find((_, i) => args[i - 1] === '--id') || 'gw-auxiliary-001';
  const port = parseInt(args.find((_, i) => args[i - 1] === '--port') || '18789');
  const mainGatewayUrl = args.find((_, i) => args[i - 1] === '--main-gateway');
  const mainGatewayToken = args.find((_, i) => args[i - 1] === '--token') || '';
  
  if (!mainGatewayUrl) {
    console.error('错误：必须指定 --main-gateway 参数');
    process.exit(1);
  }
  
  console.log('='.repeat(50));
  console.log('  Gateway 分层协议 - 辅网关');
  console.log('='.repeat(50));
  console.log(`网关 ID: ${gatewayId}`);
  console.log(`监听端口：${port}`);
  console.log(`主网关 URL: ${mainGatewayUrl}`);
  console.log('='.repeat(50));
  
  // 创建并启动辅网关
  const auxGateway = AuxiliaryGateway.create({
    gatewayId,
    port,
    mainGatewayUrl,
    mainGatewayToken,
  });
  
  // 注册事件处理器
  auxGateway.on('gateway:registered', ({ gatewayId }) => {
    console.log(`[事件] 注册成功：${gatewayId}`);
  });
  
  auxGateway.on('task:ack', (response) => {
    console.log(`[事件] 任务确认：${response.taskId} (${response.status})`);
  });
  
  auxGateway.on('error', (error) => {
    console.error(`[事件] 错误：${error.message}`);
  });
  
  auxGateway.on('status:change', ({ from, to }) => {
    console.log(`[事件] 状态变化：${from} -> ${to}`);
  });
  
  // 启动网关
  auxGateway.start()
    .then(() => {
      console.log('辅网关启动成功，按 Ctrl+C 停止');
      
      // 处理退出信号
      process.on('SIGINT', async () => {
        console.log('\n正在停止辅网关...');
        await auxGateway.stop();
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('辅网关启动失败:', error);
      process.exit(1);
    });
}
