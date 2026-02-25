/**
 * Gateway 分层协议 - 类型定义
 * 版本：v1.0.0
 * 创建：2026-02-26
 */

// ==================== 网关角色 ====================

/**
 * 网关角色类型
 */
export type GatewayRole = 'main' | 'auxiliary' | 'branch';

/**
 * 网关状态
 */
export type GatewayStatus = 'online' | 'offline' | 'connecting' | 'error';

// ==================== 网关配置 ====================

/**
 * 网关配置接口
 */
export interface GatewayConfig {
  /** 网关角色 */
  role: GatewayRole;
  /** 网关唯一 ID */
  gatewayId: string;
  /** 监听端口 */
  port: number;
  /** 管理端口（仅主网关） */
  managementPort?: number;
  /** 主网关 URL（仅辅网关/分支节点） */
  mainGatewayUrl?: string;
  /** 主网关 Token（仅辅网关/分支节点） */
  mainGatewayToken?: string;
  /** 设备指纹 */
  deviceFingerprint?: string;
  /** IP 白名单（仅主网关） */
  allowedGatewayIPs?: string[];
}

// ==================== 协议扩展字段 ====================

/**
 * Gateway 分层协议扩展字段
 */
export interface GatewayExtension {
  /** 网关角色 */
  gatewayRole: GatewayRole;
  /** 网关唯一 ID */
  gatewayId: string;
  /** 目标网关 ID（跨网关时必填） */
  targetGatewayId?: string;
  /** 任务类型 */
  taskType: 'local' | 'cross-gateway' | 'broadcast';
  /** 路由路径（多跳时） */
  routePath?: string[];
  /** 结果返回路径 */
  resultRoute?: 'return-to-sender' | 'return-to-main';
}

// ==================== 消息类型 ====================

/**
 * 基础消息类型
 */
export interface BaseMessage {
  type: string;
  from: string;
  to: string;
  timestamp: string;
  payload?: any;
}

/**
 * 网关注册请求（辅→主）
 */
export interface GatewayRegisterRequest extends BaseMessage {
  type: 'gateway.register';
  gatewayId: string;
  gatewayRole: GatewayRole;
  info: {
    host: string;
    port: number;
    agentCount: number;
    status: GatewayStatus;
    deviceFingerprint?: string;
  };
}

/**
 * 网关注册响应（主→辅）
 */
export interface GatewayRegisterResponse extends BaseMessage {
  type: 'gateway.register.ack';
  status: 'success' | 'error';
  assignedId?: string;
  heartbeatInterval?: number;
  message?: string;
}

/**
 * 心跳请求（辅→主）
 */
export interface GatewayHeartbeatRequest extends BaseMessage {
  type: 'gateway.heartbeat';
  gatewayId: string;
  status: GatewayStatus;
  load: {
    cpu: number;
    memory: number;
    activeTasks: number;
  };
}

/**
 * 心跳响应（主→辅）
 */
export interface GatewayHeartbeatResponse extends BaseMessage {
  type: 'gateway.heartbeat.ack';
  status: 'ok' | 'error';
  pendingTasks?: number;
}

/**
 * 任务下发请求（主→辅）
 */
export interface GatewayTaskDispatchRequest extends BaseMessage {
  type: 'gateway.task.dispatch';
  taskId: string;
  fromGateway: string;
  toGateway: string;
  taskType: 'cross-gateway' | 'broadcast';
  payload: {
    agentId: string;
    command: string;
    params?: any;
  };
}

/**
 * 任务确认响应（辅→主）
 */
export interface GatewayTaskAckResponse extends BaseMessage {
  type: 'gateway.task.ack';
  taskId: string;
  status: 'received' | 'error';
  estimatedDuration?: number;
  message?: string;
}

/**
 * 任务结果汇报（辅→主）
 */
export interface GatewayTaskResultRequest extends BaseMessage {
  type: 'gateway.task.result';
  taskId: string;
  fromGateway: string;
  toGateway: string;
  status: 'success' | 'failed' | 'timeout';
  result: {
    output?: string;
    duration?: number;
    artifacts?: string[];
    error?: string;
  };
}

/**
 * 任务结果确认（主→辅）
 */
export interface GatewayTaskResultAckResponse extends BaseMessage {
  type: 'gateway.task.result.ack';
  taskId: string;
  status: 'received';
}

// ==================== 联合类型 ====================

/**
 * 所有请求类型
 */
export type GatewayRequest =
  | GatewayRegisterRequest
  | GatewayHeartbeatRequest
  | GatewayTaskDispatchRequest
  | GatewayTaskResultRequest;

/**
 * 所有响应类型
 */
export type GatewayResponse =
  | GatewayRegisterResponse
  | GatewayHeartbeatResponse
  | GatewayTaskAckResponse
  | GatewayTaskResultAckResponse;

/**
 * 所有消息类型
 */
export type GatewayMessage = GatewayRequest | GatewayResponse;

// ==================== 辅助类型 ====================

/**
 * 连接的辅网关信息
 */
export interface ConnectedGateway {
  gatewayId: string;
  gatewayRole: GatewayRole;
  host: string;
  port: number;
  status: GatewayStatus;
  connectedAt: string;
  lastHeartbeat: string;
  load?: {
    cpu: number;
    memory: number;
    activeTasks: number;
  };
}

/**
 * 任务状态
 */
export interface TaskStatus {
  taskId: string;
  fromGateway: string;
  toGateway: string;
  status: 'pending' | 'dispatched' | 'running' | 'completed' | 'failed';
  dispatchedAt: string;
  completedAt?: string;
  result?: any;
}

// ==================== 错误类型 ====================

/**
 * Gateway 错误代码
 */
export enum GatewayErrorCode {
  /** 未授权 */
  UNAUTHORIZED = 'GATEWAY_001',
  /** 网关注册失败 */
  REGISTER_FAILED = 'GATEWAY_002',
  /** 网关不存在 */
  GATEWAY_NOT_FOUND = 'GATEWAY_003',
  /** 任务下发失败 */
  TASK_DISPATCH_FAILED = 'GATEWAY_004',
  /** 心跳超时 */
  HEARTBEAT_TIMEOUT = 'GATEWAY_005',
  /** 连接断开 */
  CONNECTION_LOST = 'GATEWAY_006',
  /** 无效的消息类型 */
  INVALID_MESSAGE_TYPE = 'GATEWAY_007',
  /** 参数错误 */
  INVALID_PARAMS = 'GATEWAY_008',
}

/**
 * Gateway 错误
 */
export interface GatewayError {
  code: GatewayErrorCode;
  message: string;
  details?: any;
}
