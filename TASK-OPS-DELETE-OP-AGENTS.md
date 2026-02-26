# 🔴 紧急任务 - 删除空壳 op-* Agent 配置

**派发时间**: 2026-02-26 01:40
**派发人**: main（大管家）
**接收人**: ops（运维总监）
**优先级**: 🔴 T0+（子超亲自指示）

---

## 子超问题

**子超原话**:
> "后台控制台它多出了 8 个未知路径的这个 Agent 然后是你们的整个分身的一个状态，这个就很懵。"
> "其实已经有实体的这个 Agent 我截出来的图都是一些空壳的 Agent 我不知道是如何产生的"
> "所以你们要溯源把它删掉。我去跟运维总监说，叫他删掉。"

**子超截图**: 后台控制台显示 8 个空壳 Agent（workspace-dev\agents\* 路径）

---

## 问题溯源

### 空壳 Agent 清单

| Agent ID | 配置路径 | 实际存在 | 状态 |
|----------|----------|----------|------|
| op-main | E:\.openclaw\workspace-dev\agents\main | ❌ 不存在 | 空壳 |
| op-dev | E:\.openclaw\workspace-dev\agents\dev | ❌ 不存在 | 空壳 |
| op-ops | E:\.openclaw\workspace-dev\agents\ops | ❌ 不存在 | 空壳 |
| op-content | E:\.openclaw\workspace-dev\agents\content | ❌ 不存在 | 空壳 |
| op-finance | E:\.openclaw\workspace-dev\agents\finance | ❌ 不存在 | 空壳 |
| op-growth | E:\.openclaw\workspace-dev\agents\growth | ❌ 不存在 | 空壳 |
| op-security | E:\.openclaw\workspace-dev\agents\security | ❌ 不存在 | 空壳 |
| op-design | E:\.openclaw\workspace-dev\agents\design | ❌ 不存在 | 空壳 |

### 配置位置

**openclaw.json** 中的错误配置：
```json
{
  "id": "op-main",
  "workspace": "E:\\.openclaw\\workspace-dev\\agents\\main",
  "agentDir": "E:\\.openclaw\\agents\\op-main\\agent"
}
// ... 其他 7 个 op-* Agent
```

### 产生原因

这些 op-* Agent 是之前**跨域联调方案**（Operator 模式）的配置残留：
- 设计目的：作为主团队的"操作员"分身
- 实际状态：从未真正创建实体
- 问题：配置留在 openclaw.json 中，后台控制台显示为空壳

---

## 删除任务

### ops 负责

1. **编辑 openclaw.json**
   - 删除 8 个 op-* Agent 配置
   - 保留 8 个主 Agent（main/dev/ops/content/design/finance/growth/security）

2. **删除 op-* Agent 目录（如果存在）**
   - `E:\.openclaw\agents\op-main\`
   - `E:\.openclaw\agents\op-dev\`
   - `E:\.openclaw\agents\op-ops\`
   - `E:\.openclaw\agents\op-content\`
   - `E:\.openclaw\agents\op-finance\`
   - `E:\.openclaw\agents\op-growth\`
   - `E:\.openclaw\agents\op-security\`
   - `E:\.openclaw\agents\op-design\`

3. **重启 Gateway**
   ```bash
   openclaw gateway restart
   ```

4. **验证**
   - 后台控制台只显示 8 个主 Agent
   - Agent 通信正常

---

## 修改后 openclaw.json agents.list

```json
"agents": {
  "list": [
    { "id": "main", "name": "大管家", "workspace": "E:\\.openclaw\\workspace", "agentDir": "E:\\.openclaw\\agents\\main" },
    { "id": "dev", "name": "开发总工", "workspace": "E:\\.openclaw\\workspace-dev", "agentDir": "E:\\.openclaw\\agents\\dev" },
    { "id": "ops", "name": "运维总监", "workspace": "E:\\.openclaw\\workspace-ops", "agentDir": "E:\\.openclaw\\agents\\ops" },
    { "id": "content", "name": "内容总监", "workspace": "E:\\.openclaw\\workspace-content", "agentDir": "E:\\.openclaw\\agents\\content" },
    { "id": "finance", "name": "财务总监", "workspace": "E:\\.openclaw\\workspace-finance", "agentDir": "E:\\.openclaw\\agents\\finance" },
    { "id": "growth", "name": "增长总监", "workspace": "E:\\.openclaw\\workspace-growth", "agentDir": "E:\\.openclaw\\agents\\growth" },
    { "id": "security", "name": "安全总监", "workspace": "E:\\.openclaw\\workspace-security", "agentDir": "E:\\.openclaw\\agents\\security" },
    { "id": "design", "name": "设计总监", "workspace": "E:\\.openclaw\\workspace-design", "agentDir": "E:\\.openclaw\\agents\\design" }
  ]
}
```

---

## 立即行动

**ops 请立即**：
1. 删除 8 个 op-* Agent 配置
2. 删除 op-* Agent 目录（如果存在）
3. 重启 Gateway
4. 验证后台控制台只显示 8 个主 Agent
5. 汇报完成

---

*派发时间：2026-02-26 01:40*
*要求回复：01:50 前*

🚨 **紧急！子超等待清理！**
