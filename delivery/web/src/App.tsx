/**
 * Gateway Manager - 黑色风格管理界面
 */

import { useState, useEffect } from 'react'

// 类型定义
interface Gateway {
  gatewayId: string
  gatewayRole: string
  status: 'online' | 'offline'
  cpu?: number
  memory?: number
  lastHeartbeat?: string
}

interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface Task {
  taskId: string
  toGateway: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: number
}

function App() {
  // 状态管理
  const [connected, setConnected] = useState(false)
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  
  // 任务表单
  const [selectedGateway, setSelectedGateway] = useState('')
  const [agentId, setAgentId] = useState('dev')
  const [command, setCommand] = useState('code-review')
  const [params, setParams] = useState('{"repo": "opencloud-migration"}')

  // WebSocket 连接
  useEffect(() => {
    addLog('info', '正在连接到主网关...')
    
    const ws = new WebSocket('ws://localhost:18790')
    
    ws.onopen = () => {
      setConnected(true)
      addLog('success', '已连接到主网关 ws://localhost:18790')
    }
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        addLog('info', `收到消息：${message.type}`)
        
        // 处理网关注册
        if (message.type === 'gateway.register') {
          setGateways(prev => [...prev, {
            gatewayId: message.gatewayId,
            gatewayRole: message.gatewayRole,
            status: 'online',
            cpu: Math.floor(Math.random() * 50) + 20,
            memory: Math.floor(Math.random() * 40) + 30,
            lastHeartbeat: '刚刚'
          }])
          addLog('success', `网关注册：${message.gatewayId}`)
        }
        
        // 处理任务结果
        if (message.type === 'gateway.task.result') {
          addLog('success', `任务完成：${message.taskId} (${message.status})`)
          setTasks(prev => [...prev, {
            taskId: message.taskId,
            toGateway: message.fromGateway,
            status: message.status === 'success' ? 'completed' : 'failed',
            duration: message.result?.duration || 0
          }])
        }
      } catch (e) {
        console.error('消息解析失败:', e)
      }
    }
    
    ws.onerror = () => {
      addLog('error', '连接失败')
    }
    
    ws.onclose = () => {
      setConnected(false)
      addLog('warning', '与主网关断开连接')
    }
    
    return () => {
      ws.close()
    }
  }, [])

  // 添加日志
  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-49), {
      time: new Date().toLocaleTimeString('zh-CN'),
      message,
      type
    }])
  }

  // 发送任务
  const sendTask = () => {
    if (!selectedGateway) {
      addLog('warning', '请选择目标网关')
      return
    }

    const taskId = `task-${Date.now()}`
    addLog('info', `任务下发：${taskId} → ${selectedGateway}`)
    
    setTasks(prev => [...prev, {
      taskId,
      toGateway: selectedGateway,
      status: 'pending'
    }])

    // 模拟任务完成
    setTimeout(() => {
      setTasks(prev => prev.map(t => 
        t.taskId === taskId ? { ...t, status: 'running' } : t
      ))
      addLog('info', `任务执行中：${taskId}`)
      
      setTimeout(() => {
        setTasks(prev => prev.map(t => 
          t.taskId === taskId ? { ...t, status: 'completed', duration: Math.floor(Math.random() * 200) + 50 } : t
        ))
        addLog('success', `任务完成：${taskId} (${Math.floor(Math.random() * 200) + 50}ms)`)
      }, 1500)
    }, 500)
  }

  return (
    <div style={styles.container}>
      {/* 顶部导航栏 */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🔷</span>
          <span style={styles.logoText}>Gateway Manager</span>
        </div>
        <div style={styles.status}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: connected ? '#10b981' : '#ef4444'
          }} />
          <span style={styles.statusText}>{connected ? '运行中' : '未连接'}</span>
        </div>
      </header>

      {/* 主内容区 */}
      <main style={styles.main}>
        {/* 统计卡片 */}
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{gateways.filter(g => g.status === 'online').length}</div>
            <div style={styles.statLabel}>已连接网关</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{tasks.filter(t => t.status === 'running').length}</div>
            <div style={styles.statLabel}>活跃任务</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{tasks.filter(t => t.status === 'completed').length}</div>
            <div style={styles.statLabel}>今日完成</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{logs.filter(l => l.type === 'error').length}</div>
            <div style={styles.statLabel}>错误数</div>
          </div>
        </div>

        {/* 网关列表 + 任务下发 */}
        <div style={styles.grid}>
          {/* 网关列表 */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📡 网关列表</h2>
            <div style={styles.gatewayList}>
              {gateways.map(gw => (
                <div key={gw.gatewayId} style={{
                  ...styles.gatewayItem,
                  borderLeft: `3px solid ${gw.status === 'online' ? '#10b981' : '#6b7280'}`
                }}>
                  <div style={styles.gatewayHeader}>
                    <span style={styles.gatewayId}>{gw.gatewayId}</span>
                    <span style={{
                      ...styles.gatewayStatus,
                      color: gw.status === 'online' ? '#10b981' : '#6b7280'
                    }}>
                      {gw.status === 'online' ? '🟢 在线' : '🔴 离线'}
                    </span>
                  </div>
                  <div style={styles.gatewayInfo}>
                    <span>角色：{gw.gatewayRole}</span>
                    {gw.status === 'online' && (
                      <>
                        <span>CPU: {gw.cpu}%</span>
                        <span>内存：{gw.memory}%</span>
                      </>
                    )}
                    <span>心跳：{gw.lastHeartbeat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 任务下发 */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📤 任务下发</h2>
            <div style={styles.form}>
              <label style={styles.label}>目标网关</label>
              <select 
                style={styles.select}
                value={selectedGateway}
                onChange={e => setSelectedGateway(e.target.value)}
              >
                <option value="">请选择网关...</option>
                {gateways.filter(gw => gw.status === 'online').map(gw => (
                  <option key={gw.gatewayId} value={gw.gatewayId}>
                    {gw.gatewayId}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Agent ID</label>
              <select 
                style={styles.select}
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
              >
                <option value="main">main</option>
                <option value="dev">dev</option>
                <option value="ops">ops</option>
                <option value="content">content</option>
                <option value="finance">finance</option>
                <option value="growth">growth</option>
                <option value="security">security</option>
                <option value="design">design</option>
              </select>

              <label style={styles.label}>命令</label>
              <select 
                style={styles.select}
                value={command}
                onChange={e => setCommand(e.target.value)}
              >
                <option value="code-review">code-review</option>
                <option value="test">test</option>
                <option value="deploy">deploy</option>
                <option value="status-report">status-report</option>
                <option value="custom">custom</option>
              </select>

              <label style={styles.label}>参数 (JSON)</label>
              <textarea 
                style={styles.textarea}
                value={params}
                onChange={e => setParams(e.target.value)}
                rows={3}
              />

              <button style={styles.button} onClick={sendTask}>
                🚀 发送任务
              </button>
            </div>
          </div>
        </div>

        {/* 任务列表 + 实时日志 */}
        <div style={styles.grid}>
          {/* 任务列表 */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📋 任务列表</h2>
            <div style={styles.taskList}>
              {tasks.slice(-5).reverse().map(task => (
                <div key={task.taskId} style={styles.taskItem}>
                  <span style={styles.taskId}>{task.taskId}</span>
                  <span style={{
                    ...styles.taskStatus,
                    color: task.status === 'completed' ? '#10b981' : 
                           task.status === 'running' ? '#f59e0b' : 
                           task.status === 'failed' ? '#ef4444' : '#6b7280'
                  }}>
                    {task.status === 'completed' ? '✅ 完成' : 
                     task.status === 'running' ? '⏳ 执行中' : 
                     task.status === 'failed' ? '❌ 失败' : '⏸️ 等待'}
                  </span>
                  {task.duration && <span style={styles.taskDuration}>{task.duration}ms</span>}
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={styles.empty}>暂无任务</div>
              )}
            </div>
          </div>

          {/* 实时日志 */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📝 实时日志</h2>
            <div style={styles.logContainer}>
              {logs.map((log, i) => (
                <div key={i} style={{
                  ...styles.logEntry,
                  borderLeft: `3px solid ${
                    log.type === 'success' ? '#10b981' :
                    log.type === 'error' ? '#ef4444' :
                    log.type === 'warning' ? '#f59e0b' : '#3b82f6'
                  }`
                }}>
                  <span style={styles.logTime}>{log.time}</span>
                  <span style={styles.logMessage}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// 样式（黑色主题）
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    color: '#e5e5e5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #333',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  main: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid #333',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #333',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#fff',
  },
  gatewayList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  gatewayItem: {
    backgroundColor: '#262626',
    borderRadius: '8px',
    padding: '12px',
  },
  gatewayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  gatewayId: {
    fontWeight: 'bold',
    color: '#fff',
  },
  gatewayStatus: {
    fontSize: '14px',
  },
  gatewayInfo: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#9ca3af',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  select: {
    backgroundColor: '#262626',
    border: '1px solid #404040',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#e5e5e5',
    fontSize: '14px',
    cursor: 'pointer',
  },
  textarea: {
    backgroundColor: '#262626',
    border: '1px solid #404040',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#e5e5e5',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical',
  },
  button: {
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  taskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: '6px',
    padding: '10px 12px',
  },
  taskId: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#e5e5e5',
  },
  taskStatus: {
    fontSize: '13px',
  },
  taskDuration: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '20px',
  },
  logContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  logEntry: {
    display: 'flex',
    gap: '12px',
    backgroundColor: '#262626',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
  },
  logTime: {
    fontFamily: 'monospace',
    color: '#6b7280',
    fontSize: '12px',
  },
  logMessage: {
    color: '#e5e5e5',
  },
}

export default App
