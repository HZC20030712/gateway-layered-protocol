/**
 * Gateway 分层协议 - 主网关入口
 * 版本：v1.0.0
 * 创建：2026-02-26
 */

import { Gateway } from './gateway';
import { GatewayConfig } from './protocol/types';
import { ConnectedGateway, GatewayRole } from './protocol/types';

/**
 * 主网关配置
 */
interface MainGatewayConfig extends GatewayConfig {
  role: 'main';
  managementPort: number;
  allowedGatewayIPs?: string[];
}

/**
 * 主网关类
 */
export class MainGateway extends Gateway {
  constructor(config: MainGatewayConfig) {
    super(config);
  }

  /**
   * 创建主网关实例
   */
  static create(config: {
    gatewayId: string;
    port?: number;
    managementPort?: number;
    allowedGatewayIPs?: string[];
  }): MainGateway {
    const mainConfig: MainGatewayConfig = {
      role: 'main',
      gatewayId: config.gatewayId || 'gw-main-001',
      port: config.port || 18789,
      managementPort: config.managementPort || 18790,
      allowedGatewayIPs: config.allowedGatewayIPs,
    };

    return new MainGateway(mainConfig);
  }

  /**
   * 获取已连接的辅网关列表
   */
  getAuxiliaryGateways() {
    return this.getConnectedGateways().filter(gw => gw.gatewayRole === 'auxiliary');
  }

  /**
   * 获取已连接的分支节点列表
   */
  getBranchGateways() {
    return this.getConnectedGateways().filter(gw => gw.gatewayRole === 'branch');
  }

  /**
   * 广播任务到所有辅网关
   */
  async broadcastTask(task: {
    taskId: string;
    agentId: string;
    command: string;
    params?: any;
  }): Promise<void> {
    const gateways = this.getAuxiliaryGateways();
    console.log(`[MainGateway] 广播任务到 ${gateways.length} 个辅网关`);

    for (const gw of gateways) {
      try {
        await this.dispatchTask(gw.gatewayId, task);
        console.log(`[MainGateway] 已下发到 ${gw.gatewayId}`);
      } catch (error: any) {
        console.error(`[MainGateway] 下发到 ${gw.gatewayId} 失败：${error.message || 'Unknown error'}`);
      }
    }
  }
}

// ==================== CLI 入口 ====================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  const gatewayId = args.find((_, i) => args[i - 1] === '--id') || 'gw-main-001';
  const port = parseInt(args.find((_, i) => args[i - 1] === '--port') || '18789');
  const managementPort = parseInt(args.find((_, i) => args[i - 1] === '--management-port') || '18790');
  
  console.log('='.repeat(50));
  console.log('  Gateway 分层协议 - 主网关');
  console.log('='.repeat(50));
  console.log(`网关 ID: ${gatewayId}`);
  console.log(`监听端口：${port}`);
  console.log(`管理端口：${managementPort}`);
  console.log('='.repeat(50));
  
  // 创建并启动主网关
  const mainGateway = MainGateway.create({
    gatewayId,
    port,
    managementPort,
  });
  
  // 注册事件处理器
  mainGateway.on('gateway:register', ({ gatewayId, gatewayRole, info }) => {
    console.log(`[事件] 网关注册：${gatewayId} (${gatewayRole})`);
  });
  
  mainGateway.on('gateway:disconnect', ({ gatewayId }) => {
    console.log(`[事件] 网关断开：${gatewayId}`);
  });
  
  mainGateway.on('task:dispatch', (message) => {
    console.log(`[事件] 任务下发：${message.taskId}`);
  });
  
  mainGateway.on('task:result', ({ taskId, status, result }) => {
    console.log(`[事件] 任务结果：${taskId} (${status})`);
  });
  
  mainGateway.on('error', (error) => {
    console.error(`[事件] 错误：${error.message}`);
  });
  
  // 启动网关
  mainGateway.start()
    .then(() => {
      console.log('主网关启动成功，按 Ctrl+C 停止');
      
      // 处理退出信号
      process.on('SIGINT', async () => {
        console.log('\n正在停止主网关...');
        await mainGateway.stop();
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('主网关启动失败:', error);
      process.exit(1);
    });
}
