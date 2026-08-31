// 聊天核心：消息条目流 + 运行状态 + 用量 + SSE 生命周期 + 发送流程
// SSE 铁律：
//   1. 终态（task_done / error）必 close —— 防浏览器 3 秒自动重连风暴
//   2. 发送前必 connect（先连后发，不丢事件）
//   3. 切会话必 close（由 reset 触发）
import { defineStore } from 'pinia'
import * as chatApi from '@/api/chat'
import { createEventSource } from '@/api/events'
import { normalizeStatus } from '@/utils/format'
import { useChangeStore } from './changeStore'
import { useSessionStore } from './sessionStore'

let es = null // EventSource 不进 reactive（模块级）
let seq = 0
let sendLock = false // 发送流程锁（模块级，reset 不清除，防双击重复创建会话）
let eventSinceRestore = false // 缓存恢复后是否收到过事件（任务活性校验用）

// 会触发"运行中"推断的任务事件（刷新后恢复场景）。
// 注意：change_status 不在此列 —— 用户可能在空闲时从变更面板确认遗留的 pending，
// 若后端为此推送 change_status 而误判"运行中"，输入框会被永久锁死
const TASK_EVENT_TYPES = [
  'thinking',
  'tool_call',
  'tool_result',
  'usage',
  'context_compressed',
  'request_confirmation',
  'message',
]

export const useChatStore = defineStore('chat', {
  state: () => ({
    sessionId: null,
    // 统一消息条目：{id, kind, ...}
    // kind: user(带 permissionLevel) | assistant | thinking | tool(name,args,ok,output)
    //       | confirm(changeId,filePath,operation,diff,status,busy) | error | system(text,level)
    items: [],
    running: false,
    runPermission: null,
    usage: null, // {llm_calls, context_tokens, prompt_tokens, completion_tokens}
    input: '',
    // 权限选择持久化（刷新后保持上次选择）
    permissionLevel: Number(localStorage.getItem('ca-perm-level')) || 2,
    /** 无会话时输入框旁的工作目录（有会话后固定，不再使用） */
    workspace: '',
    sending: false, // 发送流程进行中（发送按钮显示加载态）
    streamStatus: 'disconnected', // disconnected | connecting | listening | running | reconnecting
    lastStreamError: false, // 空闲时连接失败（Header 显示"重连"按钮；任务正常结束不算）
    /** 会话切换时的消息流快照缓存：sessionId → {items, running, runPermission, usage} */
    cache: {},
    /** 正在运行任务的会话 id（切换会话不丢失，绿点据此显示在侧栏） */
    runningSessionId: null,
  }),

  actions: {
    nextId() {
      return ++seq
    },

    /** 设置权限级别并持久化（刷新后保持） */
    setPermissionLevel(level) {
      if (![1, 2, 3].includes(Number(level))) return
      this.permissionLevel = Number(level)
      localStorage.setItem('ca-perm-level', String(level))
    },

    addItem(item) {
      // 记录消息时间（本地时间），用于相对时间展示
      this.items.push({ id: this.nextId(), at: Date.now(), ...item })
      return this.items[this.items.length - 1]
    },

    /**
     * 会话切换 / 删除：先把当前会话快照入缓存，再断流 + 清空。
     * 注意：running / runningSessionId / runPermission **不清**——
     * 任务可能仍在后端运行，运行状态跨会话保持（绿点、输入锁定的依据）
     */
    reset(sessionId) {
      this.snapshotCache()
      this.closeStream()
      this.sessionId = sessionId || null
      this.items = []
      this.usage = null
      this.lastStreamError = false
    },

    // ---------------- 会话切换缓存（运行中的消息流不落库，切回时靠快照恢复） ----------------

    /** 把当前会话的消息流快照存入内存缓存 */
    snapshotCache() {
      if (!this.sessionId) return
      this.cache[this.sessionId] = {
        items: JSON.parse(JSON.stringify(this.items)),
        running: this.running,
        runPermission: this.runPermission,
        usage: this.usage ? { ...this.usage } : null,
        runningSessionId: this.runningSessionId,
      }
    },

    /** 取出某会话的快照（不删除） */
    restoreCache(id) {
      return this.cache[id] || null
    },

    /** 应用缓存快照，恢复切换前的现场 */
    applyCache(c) {
      this.items = c.items.map((it) => ({ ...it }))
      this.running = !!c.running
      this.runPermission = c.runPermission
      this.usage = c.usage ? { ...c.usage } : null
      this.runningSessionId = c.runningSessionId ?? (c.running ? this.sessionId : null)
    },

    /** 任务结束后历史已落库，无需再靠缓存，清理之 */
    clearCache(id) {
      delete this.cache[id]
    },

    /**
     * 缓存恢复显示"运行中"后的活性校验：
     * 错过 task_done 的场景（切走期间任务已结束）——若一段时间内无事件且无 L1 待确认，
     * 判定任务已结束、解锁输入框。
     * 注意：
     * - 窗口取 15s（覆盖 LLM 思考间隔；期间事件到达即视为活跃）
     * - 不覆盖消息流、不关闭 SSE（误判时缓存消息必须保留；
     *   后续事件到达会自动恢复 running，用户发送会被后端 400 权威兜底）
     */
    verifyRunningTask() {
      eventSinceRestore = false
      setTimeout(() => {
        if (eventSinceRestore) return // 有新事件 → 任务还在跑
        const changeStore = useChangeStore()
        if (changeStore.pendingCount > 0) return // 有 L1 待确认 → 任务在等用户
        this.running = false
        this.runPermission = null
        this.runningSessionId = null
      }, 15000)
    },

    /** 等待 SSE 连接就绪（最多 waitMs）。连接失败或超时返回 false */
    async waitStreamOpen(sessionId, waitMs = 5000) {
      const start = Date.now()
      return new Promise((resolve) => {
        const tick = () => {
          const now = Date.now()
          if (es && es.readyState === EventSource.OPEN && this.sessionId === sessionId) {
            resolve(true)
            return
          }
          // 注意：会话编排（useActiveSession）可能刚 close 了旧流准备重连，
          // 此时 CLOSED 是暂时的 —— 持续 1s 仍是 CLOSED 才算失败
          if (es && es.readyState === EventSource.CLOSED && now - start > 1000) {
            resolve(false)
            return
          }
          if (now - start > waitMs) {
            resolve(false)
            return
          }
          setTimeout(tick, 100)
        }
        tick()
      })
    },

    async loadHistory(sessionId) {
      const msgs = await chatApi.fetchMessages(sessionId)
      this.items = msgs.map((m) => {
        const at = m.created_at ? new Date(String(m.created_at).replace(' ', 'T')).getTime() : Date.now()
        return m.role === 'user'
          ? { id: this.nextId(), kind: 'user', content: m.content, permissionLevel: m.permission_level, at }
          : { id: this.nextId(), kind: 'assistant', content: m.content, at }
      })
    },

    /** 连接 SSE（复用同会话已开连接；空闲时保持长连接等待事件） */
    connectStream(sessionId) {
      if (es && es.readyState === EventSource.OPEN && this.sessionId === sessionId) return es
      this.closeStream()
      this.sessionId = sessionId
      this.streamStatus = 'connecting'
      this.lastStreamError = false
      es = createEventSource(sessionId, {
        onEvent: (ev) => this.handleEvent(ev),
        onError: (stream) => this.handleStreamError(stream),
      })
      // 连接建立：空闲态标记为 listening（等待任务事件）
      es.onopen = () => {
        if (this.running) {
          this.streamStatus = 'running'
        } else {
          this.streamStatus = 'listening'
        }
        this.lastStreamError = false
      }
      return es
    },

    closeStream() {
      if (es) {
        es.onmessage = null
        es.onerror = null
        es.onopen = null
        try {
          es.close()
        } catch {
          /* noop */
        }
        es = null
      }
      this.streamStatus = 'disconnected'
    },

    handleStreamError(stream) {
      if (!es) return
      // 已关闭：我们主动 close（终态/切会话）→ 忽略
      if (stream.readyState === EventSource.CLOSED) return
      // CONNECTING：浏览器自动重连中
      if (this.running) {
        this.streamStatus = 'reconnecting'
        return
      }
      // 空闲时连接失败 → 断开，不再自动重连（Header 提供手动"重连"按钮）
      this.lastStreamError = true
      this.closeStream()
    },

    // ---------------- SSE 事件分发 ----------------
    handleEvent(ev) {
      if (!ev || !ev.type) return
      eventSinceRestore = true // 有事件到达 = 任务仍然活跃
      switch (ev.type) {
        case 'task_start':
          this.running = true
          this.runPermission = ev.permission_level ?? this.runPermission
          this.usage = null
          this.streamStatus = 'running'
          this.runningSessionId = this.sessionId
          break
        case 'thinking':
          this.addThinking(ev.content)
          break
        case 'tool_call':
          this.addItem({ kind: 'tool', name: ev.name, args: ev.args, ok: null, output: '' })
          break
        case 'tool_result':
          this.pairToolResult(ev)
          break
        case 'usage':
          this.usage = {
            llm_calls: ev.llm_calls,
            context_tokens: ev.context_tokens,
            prompt_tokens: ev.prompt_tokens,
            completion_tokens: ev.completion_tokens,
          }
          break
        case 'context_compressed':
          this.addItem({ kind: 'system', text: '上下文已压缩，早期内容已摘要化', level: 'dim' })
          break
        case 'request_confirmation':
          this.addConfirmCard(ev)
          this.refreshChanges()
          break
        case 'change_status':
          this.syncChangeStatus(ev.change_id, ev.status)
          this.refreshChanges()
          break
        case 'message':
          // streaming 标记：前端逐字流式展示（打字机效果）
          this.addItem({ kind: 'assistant', content: ev.content, streaming: true, typedLen: 0 })
          break
        case 'task_done':
          this.finish(ev, false)
          break
        case 'error':
          this.addItem({ kind: 'error', content: ev.content })
          this.finish(ev, true)
          break
      }
      // 刷新后恢复：任何任务事件到达且本地认为空闲 → 任务实际在运行
      if (!this.running && TASK_EVENT_TYPES.includes(ev.type)) {
        this.running = true
        this.streamStatus = 'running'
        this.runningSessionId = this.sessionId
      }
    },

    addThinking(content) {
      const last = this.items[this.items.length - 1]
      if (last && last.kind === 'thinking') {
        last.content += (last.content ? '\n' : '') + content
      } else {
        // 流式标记 + 已打字长度（缓存恢复时从上次位置继续，不重播）
        this.addItem({ kind: 'thinking', content, streaming: true, typedLen: 0 })
      }
    },

    /** 后端无关联 id：按 name 倒序配对最近一个未配对的工具卡 */
    pairToolResult(ev) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i]
        if (it.kind === 'tool' && it.name === ev.name && it.ok === null) {
          it.ok = !!ev.ok
          it.output = ev.output ?? ''
          return
        }
      }
      // 配对失败 → 渲染独立工具结果行，不静默丢弃
      this.addItem({ kind: 'tool', name: ev.name, args: null, ok: !!ev.ok, output: ev.output ?? '', orphan: true })
    },

    addConfirmCard(ev) {
      // 去重规则：仅当存在**未决**（pending）的同 changeId 卡片时才跳过
      // （SSE 重连重复推送防重复卡片）。
      // 后端对同一文件多次修改会合并为同一条 change 记录（changeId 不变），
      // 因此已处理过的旧卡片应被替换为新确认请求，而不是跳过。
      const existing = this.items.find((it) => it.kind === 'confirm' && it.changeId === ev.change_id)
      if (existing) {
        if (existing.status === 'pending') return // 已在等确认，不重复
        // 旧卡片已处理（applied/rejected）→ 替换为新确认
        existing.status = 'pending'
        existing.filePath = ev.file_path
        existing.operation = ev.operation
        existing.diff = ev.diff
        existing.busy = false
        return
      }
      this.addItem({
        kind: 'confirm',
        changeId: ev.change_id,
        filePath: ev.file_path,
        operation: ev.operation,
        diff: ev.diff,
        status: 'pending',
        busy: false,
      })
    },

    syncChangeStatus(changeId, status) {
      for (const it of this.items) {
        if (it.kind === 'confirm' && it.changeId === changeId) {
          it.status = normalizeStatus(status)
        }
      }
    },

    /** 终态：关流 + 复位 + 通知外层刷新变更面板与会话列表（不追加统计文案） */
    finish(ev, isError) {
      const wasRunning = this.running
      this.closeStream()
      this.running = false
      this.runPermission = null
      this.streamStatus = 'disconnected'
      this.runningSessionId = null
      // 任务结束：停止所有流式（thinking/assistant 剩余内容直接全显，不再重播）
      for (const it of this.items) {
        if ((it.kind === 'assistant' || it.kind === 'thinking') && it.streaming) {
          it.streaming = false
        }
      }
      if (wasRunning) {
        this.refreshChanges()
        this.refreshSessions()
      }
      // 任务结束历史已落库，缓存不再需要
      this.clearCache(this.sessionId)
    },

    refreshChanges() {
      if (!this.sessionId) return
      const changeStore = useChangeStore()
      changeStore.load(this.sessionId).catch(() => {})
    },

    refreshSessions() {
      const sessionStore = useSessionStore()
      sessionStore.refresh().catch(() => {})
    },

    // ---------------- L1 确认卡操作 ----------------
    async resolveConfirm(changeId, action) {
      // 卡片置为处理中，成功后由 change_status 事件/响应更新状态
      const card = this.items.find((it) => it.kind === 'confirm' && it.changeId === changeId)
      if (card) card.busy = true
      try {
        const changeStore = useChangeStore()
        const r = action === 'confirm' ? await changeStore.confirm(changeId) : await changeStore.reject(changeId)
        this.syncChangeStatus(changeId, r.status)
        return r
      } finally {
        if (card) card.busy = false
        // 确认/拒绝完成后卡片立即从消息流移除（后端已收到决定，卡片不再需要）
        this.items = this.items.filter((it) => !(it.kind === 'confirm' && it.changeId === changeId))
      }
    },

    // ---------------- 发送流程 ----------------
    async send() {
      const content = this.input.trim()
      if (!content) return { error: '请输入任务内容' }
      if (this.running) return { error: '任务运行中，请等待完成' }
      if (sendLock) return { error: '正在发送…' }

      sendLock = true
      this.sending = true
      try {
        let sessionId = this.sessionId

        // 新会话：先用工作目录创建会话（标题 = 输入前 30 字），再发送任务
        if (!sessionId) {
          const ws = this.workspace.trim()
          if (!ws) return { error: '请先填写工作目录' }
          const sessionStore = useSessionStore()
          let s
          try {
            s = await sessionStore.create(ws, content.slice(0, 30))
          } catch (e) {
            return { error: e.message }
          }
          sessionStore.setCurrent(s.id)
          sessionId = s.id
        }

        const level = this.permissionLevel
        // 等 SSE 就绪后再发（useActiveSession 的编排此时已完成 reset+历史+连接）
        this.connectStream(sessionId) // 幂等：已有 OPEN 连接则复用
        await this.waitStreamOpen(sessionId)

        this.addItem({ kind: 'user', content, permissionLevel: level })
        this.input = ''
        this.workspace = '' // 工作目录已归属会话，清空常驻框

        try {
          await chatApi.sendChat(sessionId, content, level)
          this.running = true
          this.runPermission = level
          this.streamStatus = 'running'
          this.runningSessionId = sessionId
        } catch (e) {
          // 发送失败：恢复输入内容，方便重发
          this.input = content
          // 后端 400「任务运行中」是权威信号：确有任务在跑（多标签页/刷新后误判）
          if (e.status === 400 && /任务运行中/.test(e.message)) {
            this.input = ''
            this.running = true
            this.streamStatus = 'running'
            this.runningSessionId = this.sessionId
            this.addItem({ kind: 'system', text: '检测到任务正在运行，已接入实时事件流', level: 'info' })
          } else {
            this.addItem({ kind: 'error', content: e.message })
          }
        }
      } finally {
        sendLock = false
        this.sending = false
      }
      return null
    },
  },
})
