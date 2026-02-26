/**
 * Gateway 分层协议 - 核心网关类
 * 版本：v1.0.0
 * 创建：2026-02-26
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  GatewayConfig,
  GatewayRole,
  GatewayStatus,
  GatewayMessage,
  GatewayRequest,
  GatewayResponse,
  ConnectedGateway,
  TaskStatus,
  GatewayError,
  GatewayErrorCode,
  GatewayRegisterRequest,
  GatewayRegisterResponse,
  GatewayHeartbeatRequest,
  GatewayHeartbeatResponse,
  GatewayTaskDispatchRequest,
  GatewayTaskAckResponse,
  GatewayTaskResultRequest,
  GatewayTaskResultAckResponse,
} from './protocol/types';

/**
 * 核心网关类
 * 支持主网关、辅网关、分支节点三种角色
 */
export class Gateway extends EventEmitter {
  /** 网关配置 */
  private config: GatewayConfig;
  
  /** WebSocket 服务器（主网关） */
  private wss?: WebSocket.Server;
  
  /** WebSocket 客户端连接（辅网关） */
  private ws?: WebSocket;
  
  /** 已连接的辅网关列表（仅主网关） */
  private connectedGateways: Map<string, ConnectedGateway>;
  
  /** WebSocket 连接映射（仅主网关） */
  private wsMap: Map<string, WebSocket>;
  
  /** 待处理任务（仅主网关） */
  private pendingTasks: Map<string, TaskStatus>;
  
  /** 心跳定时器 */
  private heartbeatTimer?: NodeJS.Timeout;
  
  /** 当前状态 */
  private status: GatewayStatus;

  constructor(config: GatewayConfig) {
    super();
    this.config = config;
    this.status = 'offline';
    this.connectedGateways = new Map();
    this.wsMap = new Map();
    this.pendingTasks = new Map();
  }

  // ==================== 公共方法 ====================

  /**
   * 启动网关
   */
  async start(): Promise<void> {
    console.log(`[Gateway] 启动 ${this.config.role} 网关 (${this.config.gatewayId})`);
    
    try {
      if (this.config.role === 'main') {
        await this.startMainGateway();
      } else {
        await this.startAuxiliaryGateway();
      }
      
      this.status = 'online';
      this.emit('status:change', { from: 'offline', to: 'online' });
      console.log(`[Gateway] 网关启动成功`);
    } catch (error: any) {
      this.status = 'error';
      this.emit('error', { code: GatewayErrorCode.REGISTER_FAILED, message: error.message || 'Unknown error' });
      throw error;
    }
  }

  /**
   * 停止网关
   */
  async stop(): Promise<void> {
    console.log(`[Gateway] 停止网关 (${this.config.gatewayId})`);
    
    // 清理心跳定时器
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    // 关闭 WebSocket 服务器（主网关）
    if (this.wss) {
      this.wss.close();
      this.wss = undefined;
    }
    
    // 关闭 WebSocket 客户端（辅网关）
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    
    this.status = 'offline';
    this.emit('status:change', { from: 'online', to: 'offline' });
    console.log(`[Gateway] 网关已停止`);
  }

  /**
   * 获取网关状态
   */
  getStatus(): {
    gatewayId: string;
    role: GatewayRole;
    status: GatewayStatus;
    connectedGateways?: number;
    pendingTasks?: number;
  } {
    return {
      gatewayId: this.config.gatewayId,
      role: this.config.role,
      status: this.status,
      connectedGateways: this.connectedGateways.size,
      pendingTasks: this.pendingTasks.size,
    };
  }

  // ==================== 主网关方法 ====================

  /**
   * 启动主网关
   */
  private async startMainGateway(): Promise<void> {
    const port = this.config.port;
    const managementPort = this.config.managementPort || port + 1;
    
    return new Promise((resolve, reject) => {
      // 创建 WebSocket 服务器（管理端口）
      this.wss = new WebSocket.Server({ port: managementPort });
      
      this.wss.on('listening', () => {
        console.log(`[MainGateway] 监听端口 ${managementPort}`);
        resolve();
      });
      
      this.wss.on('error', (error) => {
        console.error(`[MainGateway] 启动失败：${error.message}`);
        reject(error);
      });
      
      this.wss.on('connection', (ws: WebSocket, req: any) => {
        console.log(`[MainGateway] 新连接：${req.socket.remoteAddress}`);
        this.handleMainGatewayConnection(ws, req);
      });
    });
  }

  /**
   * 处理主网关连接（辅网关接入）
   */
  private handleMainGatewayConnection(ws: WebSocket, req: any): void {
    let gatewayId: string | null = null;
    
    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as GatewayRequest;
        console.log(`[MainGateway] 收到消息：${message.type}`);
        
        // 根据消息类型处理
        switch (message.type) {
          case 'gateway.register':
            this.handleGatewayRegister(ws, message as GatewayRegisterRequest);
            break;
            
          case 'gateway.heartbeat':
            this.handleGatewayHeartbeat(ws, message as GatewayHeartbeatRequest);
            break;
            
          case 'gateway.task.result':
            this.handleTaskResult(ws, message as GatewayTaskResultRequest);
            break;
            
          default:
            console.warn(`[MainGateway] 未知消息类型：${message.type}`);
        }
      } catch (error: any) {
        console.error(`[MainGateway] 消息处理失败：${error.message || 'Unknown error'}`);
      }
    });
    
    ws.on('close', () => {
      if (gatewayId) {
        console.log(`[MainGateway] 网关断开：${gatewayId}`);
        this.connectedGateways.delete(gatewayId);
        this.wsMap.delete(gatewayId);
        this.emit('gateway:disconnect', { gatewayId });
      }
    });
    
    ws.on('error', (error) => {
      console.error(`[MainGateway] 连接错误：${error.message}`);
    });
  }

  /**
   * 处理网关注册
   */
  private handleGatewayRegister(ws: WebSocket, request: GatewayRegisterRequest): void {
    const { gatewayId, gatewayRole, info } = request;
    
    console.log(`[MainGateway] 网关注册：${gatewayId} (${gatewayRole})`);
    
    // 验证 IP 白名单
    if (this.config.allowedGatewayIPs && this.config.allowedGatewayIPs.length > 0) {
      const remoteIP = (ws as any)['socket']?.remoteAddress || 'unknown';
      if (!this.config.allowedGatewayIPs.includes(remoteIP)) {
        this.sendResponse(ws, {
          type: 'gateway.register.ack',
          from: this.config.gatewayId,
          to: gatewayId,
          timestamp: new Date().toISOString(),
          status: 'error',
          message: 'IP 不在白名单中',
        });
        ws.close();
        return;
      }
    }
    
    // 注册网关
    const connectedGateway: ConnectedGateway = {
      gatewayId,
      gatewayRole,
      host: info.host,
      port: info.port,
      status: 'online',
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };
    
    this.connectedGateways.set(gatewayId, connectedGateway);
    this.wsMap.set(gatewayId, ws);
    
    console.log(`[MainGateway] 已注册网关：${gatewayId}`);
    this.emit('gateway:register', { gatewayId, gatewayRole, info });
    
    // 发送注册成功响应
    this.sendResponse(ws, {
      type: 'gateway.register.ack',
      from: this.config.gatewayId,
      to: gatewayId,
      timestamp: new Date().toISOString(),
      status: 'success',
      assignedId: gatewayId,
      heartbeatInterval: 30,
      message: '注册成功',
    });
  }

  /**
   * 处理心跳
   */
  private handleGatewayHeartbeat(ws: WebSocket, request: GatewayHeartbeatRequest): void {
    const { gatewayId, load } = request;
    
    const gateway = this.connectedGateways.get(gatewayId);
    if (gateway) {
      gateway.lastHeartbeat = new Date().toISOString();
      gateway.load = load;
    }
    
    this.sendResponse(ws, {
      type: 'gateway.heartbeat.ack',
      from: this.config.gatewayId,
      to: gatewayId,
      timestamp: new Date().toISOString(),
      status: 'ok',
      pendingTasks: this.pendingTasks.size,
    });
  }

  /**
   * 处理任务结果
   */
  private handleTaskResult(ws: WebSocket, request: GatewayTaskResultRequest): void {
    const { taskId, status, result } = request;
    
    console.log(`[MainGateway] 任务结果：${taskId} (${status})`);
    
    // 更新任务状态
    const task = this.pendingTasks.get(taskId);
    if (task) {
      task.status = status === 'success' ? 'completed' : 'failed';
      task.completedAt = new Date().toISOString();
      task.result = result;
    }
    
    this.emit('task:result', { taskId, status, result });
    
    // 发送确认
    this.sendResponse(ws, {
      type: 'gateway.task.result.ack',
      from: this.config.gatewayId,
      to: request.fromGateway,
      timestamp: new Date().toISOString(),
      taskId: request.taskId,
      status: 'received',
    });
  }

  /**
   * 下发任务到辅网关
   */
  async dispatchTask(toGateway: string, task: {
    taskId: string;
    agentId: string;
    command: string;
    params?: any;
  }): Promise<void> {
    const gateway = this.connectedGateways.get(toGateway);
    if (!gateway) {
      throw new Error(`网关不存在：${toGateway}`);
    }
    
    const ws = this.wsMap.get(toGateway);
    if (!ws) {
      throw new Error(`网关连接不存在：${toGateway}`);
    }
    
    console.log(`[MainGateway] 下发任务到 ${toGateway}: ${task.taskId}`);
    
    // 记录任务
    this.pendingTasks.set(task.taskId, {
      taskId: task.taskId,
      fromGateway: this.config.gatewayId,
      toGateway,
      status: 'dispatched',
      dispatchedAt: new Date().toISOString(),
    });
    
    // 构建任务消息
    const message: GatewayTaskDispatchRequest = {
      type: 'gateway.task.dispatch',
      from: 'main',
      to: task.agentId,
      timestamp: new Date().toISOString(),
      taskId: task.taskId,
      fromGateway: this.config.gatewayId,
      toGateway,
      taskType: 'cross-gateway',
      payload: {
        agentId: task.agentId,
        command: task.command,
        params: task.params,
      },
    };
    
    // 发送消息
    ws.send(JSON.stringify(message));
    this.emit('task:dispatch', message);
  }

  /**
   * 获取已连接的网关列表
   */
  getConnectedGateways(): ConnectedGateway[] {
    return Array.from(this.connectedGateways.values());
  }

  // ==================== 辅网关方法 ====================

  /**
   * 启动辅网关
   */
  private async startAuxiliaryGateway(): Promise<void> {
    if (!this.config.mainGatewayUrl) {
      throw new Error('辅网关需要配置 mainGatewayUrl');
    }
    
    return new Promise((resolve, reject) => {
      // 连接到主网关
      const url = this.config.mainGatewayUrl || '';
      this.ws = new WebSocket(url);
      
      this.ws.on('open', () => {
        console.log(`[AuxGateway] 已连接到主网关：${this.config.mainGatewayUrl}`);
        
        // 发送注册请求
        this.registerToMainGateway();
        
        // 启动心跳
        this.startHeartbeat();
        
        resolve();
      });
      
      this.ws.on('error', (error: any) => {
        console.error(`[AuxGateway] 连接失败：${error.message || 'Unknown error'}`);
        reject(error);
      });
      
      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as any;
          console.log(`[AuxGateway] 收到消息：${message.type}`);
          
          // 处理主网关消息
          switch (message.type) {
            case 'gateway.register.ack':
              this.handleRegisterAck(message as GatewayRegisterResponse);
              break;
              
            case 'gateway.task.dispatch':
              this.handleTaskDispatch(message as GatewayTaskDispatchRequest);
              break;
              
            case 'gateway.task.ack':
              this.handleTaskAck(message as GatewayTaskAckResponse);
              break;
              
            case 'gateway.task.result.ack':
              this.handleTaskResultAck(message as GatewayTaskResultAckResponse);
              break;
              
            case 'gateway.heartbeat.ack':
              // 心跳确认，无需特殊处理
              break;
              
            default:
              console.warn(`[AuxGateway] 未知消息类型：${message.type}`);
          }
        } catch (error: any) {
          console.error(`[AuxGateway] 消息处理失败：${error.message || 'Unknown error'}`);
        }
      });
      
      this.ws.on('close', () => {
        console.log(`[AuxGateway] 与主网关断开连接`);
        this.status = 'offline';
        this.emit('status:change', { from: 'online', to: 'offline' });
        
        // 尝试重连
        setTimeout(() => this.startAuxiliaryGateway(), 5000);
      });
    });
  }

  /**
   * 注册到主网关
   */
  private registerToMainGateway(): void {
    const message: GatewayRegisterRequest = {
      type: 'gateway.register',
      from: this.config.gatewayId,
      to: 'main',
      timestamp: new Date().toISOString(),
      gatewayId: this.config.gatewayId,
      gatewayRole: this.config.role,
      info: {
        host: 'localhost',
        port: this.config.port,
        agentCount: 8, // TODO: 实际 Agent 数量
        status: 'online',
        deviceFingerprint: this.config.deviceFingerprint,
      },
    };
    
    this.sendMessage(message);
    console.log(`[AuxGateway] 发送注册请求`);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    const sendHeartbeat = () => {
      const message: GatewayHeartbeatRequest = {
        type: 'gateway.heartbeat',
        from: this.config.gatewayId,
        to: 'main',
        timestamp: new Date().toISOString(),
        gatewayId: this.config.gatewayId,
        status: 'online',
        load: {
          cpu: Math.floor(Math.random() * 100), // TODO: 实际 CPU 使用率
          memory: Math.floor(Math.random() * 100), // TODO: 实际内存使用率
          activeTasks: this.pendingTasks.size,
        },
      };
      
      this.sendMessage(message);
    };
    
    // 立即发送一次
    sendHeartbeat();
    
    // 每 30 秒发送一次
    this.heartbeatTimer = setInterval(sendHeartbeat, 30000);
  }

  /**
   * 处理注册确认
   */
  private handleRegisterAck(response: GatewayRegisterResponse): void {
    if (response.status === 'success') {
      console.log(`[AuxGateway] 注册成功：${response.assignedId}`);
      this.emit('gateway:registered', { gatewayId: response.assignedId });
    } else {
      console.error(`[AuxGateway] 注册失败：${response.message}`);
      this.emit('error', { code: GatewayErrorCode.REGISTER_FAILED, message: response.message });
    }
  }

  /**
   * 处理任务确认
   */
  private handleTaskAck(response: GatewayTaskAckResponse): void {
    console.log(`[AuxGateway] 任务确认：${response.taskId} (${response.status})`);
    this.emit('task:ack', response);
  }

  /**
   * 处理任务下发（主→辅）
   */
  private handleTaskDispatch(request: GatewayTaskDispatchRequest): void {
    const { taskId, payload } = request;
    console.log(`[AuxGateway] 收到任务：${taskId}`);
    
    // 触发任务执行事件
    this.emit('task:received', {
      taskId,
      agentId: payload.agentId,
      command: payload.command,
      params: payload.params,
    });
  }

  /**
   * 处理任务结果确认
   */
  private handleTaskResultAck(response: GatewayTaskResultAckResponse): void {
    console.log(`[AuxGateway] 任务结果确认：${response.taskId}`);
    this.emit('task:result:ack', response);
  }

  /**
   * 发送任务结果到主网关
   */
  async sendTaskResult(taskId: string, result: {
    status: 'success' | 'failed' | 'timeout';
    output?: string;
    duration?: number;
    artifacts?: string[];
    error?: string;
  }): Promise<void> {
    const message: GatewayTaskResultRequest = {
      type: 'gateway.task.result',
      from: this.config.gatewayId,
      to: 'main',
      timestamp: new Date().toISOString(),
      taskId,
      fromGateway: this.config.gatewayId,
      toGateway: 'main',
      status: result.status,
      result,
    };
    
    this.sendMessage(message);
    console.log(`[AuxGateway] 发送任务结果：${taskId}`);
  }

  // ==================== 内部方法 ====================

  /**
   * 发送消息
   */
  private sendMessage(message: GatewayMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn(`[Gateway] 无法发送消息：连接未打开`);
    }
  }

  /**
   * 发送响应
   */
  private sendResponse(ws: WebSocket, response: GatewayResponse): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }
}

// ==================== 导出 ====================

export default Gateway;
