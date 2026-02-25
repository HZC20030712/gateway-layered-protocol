/**
 * Gateway 分层协议 - 消息构建器
 * 版本：v1.0.0
 * 创建：2026-02-26
 */

import {
  GatewayRegisterRequest,
  GatewayRegisterResponse,
  GatewayHeartbeatRequest,
  GatewayHeartbeatResponse,
  GatewayTaskDispatchRequest,
  GatewayTaskAckResponse,
  GatewayTaskResultRequest,
  GatewayTaskResultAckResponse,
  GatewayRole,
  GatewayStatus,
} from './types';

/**
 * 消息构建器
 */
export class MessageBuilder {
  /**
   * 构建网关注册请求
   */
  static buildRegisterRequest(
    gatewayId: string,
    gatewayRole: GatewayRole,
    info: {
      host: string;
      port: number;
      agentCount: number;
      status: GatewayStatus;
      deviceFingerprint?: string;
    }
  ): GatewayRegisterRequest {
    return {
      type: 'gateway.register',
      from: gatewayId,
      to: 'main',
      timestamp: new Date().toISOString(),
      gatewayId,
      gatewayRole,
      info,
    };
  }

  /**
   * 构建网关注册响应
   */
  static buildRegisterResponse(
    fromGateway: string,
    toGateway: string,
    status: 'success' | 'error',
    options?: {
      assignedId?: string;
      heartbeatInterval?: number;
      message?: string;
    }
  ): GatewayRegisterResponse {
    return {
      type: 'gateway.register.ack',
      from: fromGateway,
      to: toGateway,
      timestamp: new Date().toISOString(),
      status,
      ...options,
    };
  }

  /**
   * 构建心跳请求
   */
  static buildHeartbeatRequest(
    gatewayId: string,
    load: {
      cpu: number;
      memory: number;
      activeTasks: number;
    }
  ): GatewayHeartbeatRequest {
    return {
      type: 'gateway.heartbeat',
      from: gatewayId,
      to: 'main',
      timestamp: new Date().toISOString(),
      gatewayId,
      status: 'online',
      load,
    };
  }

  /**
   * 构建心跳响应
   */
  static buildHeartbeatResponse(
    fromGateway: string,
    toGateway: string,
    status: 'ok' | 'error',
    pendingTasks?: number
  ): GatewayHeartbeatResponse {
    return {
      type: 'gateway.heartbeat.ack',
      from: fromGateway,
      to: toGateway,
      timestamp: new Date().toISOString(),
      status,
      pendingTasks,
    };
  }

  /**
   * 构建任务下发请求
   */
  static buildTaskDispatchRequest(
    taskId: string,
    fromGateway: string,
    toGateway: string,
    agentId: string,
    command: string,
    params?: any
  ): GatewayTaskDispatchRequest {
    return {
      type: 'gateway.task.dispatch',
      from: 'main',
      to: agentId,
      timestamp: new Date().toISOString(),
      taskId,
      fromGateway,
      toGateway,
      taskType: 'cross-gateway',
      payload: {
        agentId,
        command,
        params,
      },
    };
  }

  /**
   * 构建任务确认响应
   */
  static buildTaskAckResponse(
    fromGateway: string,
    toGateway: string,
    taskId: string,
    status: 'received' | 'error',
    options?: {
      estimatedDuration?: number;
      message?: string;
    }
  ): GatewayTaskAckResponse {
    return {
      type: 'gateway.task.ack',
      from: fromGateway,
      to: toGateway,
      timestamp: new Date().toISOString(),
      taskId,
      status,
      ...options,
    };
  }

  /**
   * 构建任务结果汇报
   */
  static buildTaskResultRequest(
    taskId: string,
    fromGateway: string,
    toGateway: string,
    status: 'success' | 'failed' | 'timeout',
    result: {
      output?: string;
      duration?: number;
      artifacts?: string[];
      error?: string;
    }
  ): GatewayTaskResultRequest {
    return {
      type: 'gateway.task.result',
      from: fromGateway,
      to: toGateway,
      timestamp: new Date().toISOString(),
      taskId,
      fromGateway,
      toGateway,
      status,
      result,
    };
  }

  /**
   * 构建任务结果确认
   */
  static buildTaskResultAckResponse(
    fromGateway: string,
    toGateway: string,
    taskId: string
  ): GatewayTaskResultAckResponse {
    return {
      type: 'gateway.task.result.ack',
      from: fromGateway,
      to: toGateway,
      timestamp: new Date().toISOString(),
      taskId,
      status: 'received',
    };
  }
}

/**
 * 消息验证器
 */
export class MessageValidator {
  /**
   * 验证网关注册请求
   */
  static validateRegisterRequest(message: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!message.type || message.type !== 'gateway.register') {
      errors.push('消息类型必须是 gateway.register');
    }
    
    if (!message.gatewayId) {
      errors.push('缺少 gatewayId');
    }
    
    if (!message.gatewayRole || !['main', 'auxiliary', 'branch'].includes(message.gatewayRole)) {
      errors.push('gatewayRole 必须是 main、auxiliary 或 branch');
    }
    
    if (!message.info) {
      errors.push('缺少 info');
    } else {
      if (!message.info.host) errors.push('缺少 info.host');
      if (!message.info.port) errors.push('缺少 info.port');
      if (!message.info.agentCount) errors.push('缺少 info.agentCount');
      if (!message.info.status) errors.push('缺少 info.status');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证心跳请求
   */
  static validateHeartbeatRequest(message: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!message.type || message.type !== 'gateway.heartbeat') {
      errors.push('消息类型必须是 gateway.heartbeat');
    }
    
    if (!message.gatewayId) {
      errors.push('缺少 gatewayId');
    }
    
    if (!message.load) {
      errors.push('缺少 load');
    } else {
      if (typeof message.load.cpu !== 'number') errors.push('load.cpu 必须是数字');
      if (typeof message.load.memory !== 'number') errors.push('load.memory 必须是数字');
      if (typeof message.load.activeTasks !== 'number') errors.push('load.activeTasks 必须是数字');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证任务下发请求
   */
  static validateTaskDispatchRequest(message: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!message.type || message.type !== 'gateway.task.dispatch') {
      errors.push('消息类型必须是 gateway.task.dispatch');
    }
    
    if (!message.taskId) {
      errors.push('缺少 taskId');
    }
    
    if (!message.fromGateway) {
      errors.push('缺少 fromGateway');
    }
    
    if (!message.toGateway) {
      errors.push('缺少 toGateway');
    }
    
    if (!message.payload) {
      errors.push('缺少 payload');
    } else {
      if (!message.payload.agentId) errors.push('缺少 payload.agentId');
      if (!message.payload.command) errors.push('缺少 payload.command');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
