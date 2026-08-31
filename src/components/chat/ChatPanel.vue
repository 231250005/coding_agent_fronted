<script setup>
// 中栏（Claude Code 风格）：顶栏 + 消息流 + 用量条 + 文件变更区 + 底部输入框
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { MenuOutline, Add, Moon, Sunny, Refresh } from '@vicons/ionicons5'
import { useTheme } from '@/composables/useTheme'
import { useSessionStore } from '@/stores/sessionStore'
import { useChatStore } from '@/stores/chatStore'
import MessageStream from './MessageStream.vue'
import UsageBar from './UsageBar.vue'
import ChangeStrip from './ChangeStrip.vue'
import ChatInput from './ChatInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps({
  sidebarCollapsed: Boolean,
})

const emit = defineEmits(['toggle-sidebar'])

const { isDark, toggle } = useTheme()
const sessionStore = useSessionStore()
const chatStore = useChatStore()

const current = computed(() => sessionStore.current)

function reconnect() {
  if (chatStore.sessionId) chatStore.connectStream(chatStore.sessionId)
}
</script>

<template>
  <div class="chat-panel">
    <header class="topbar">
      <!-- 仅侧栏折叠时显示：展开按钮 + 新建工作区（加号） -->
      <template v-if="sidebarCollapsed">
        <button class="icon-btn" title="展开侧边栏" @click="emit('toggle-sidebar')">
          <n-icon :component="MenuOutline" :size="15" />
        </button>
        <button class="icon-btn" title="新建工作区" @click="sessionStore.setCurrent(null)">
          <n-icon :component="Add" :size="17" />
        </button>
      </template>

      <template v-if="current">
        <div class="session-meta">
          <span class="s-title ellipsis">{{ current.title || '未命名会话' }}</span>
          <span class="s-ws ellipsis">{{ current.workspace }}</span>
        </div>
        <button
          v-if="!chatStore.running && chatStore.lastStreamError"
          class="reconnect-btn"
          title="事件流连接失败，点击重连"
          @click="reconnect"
        >
          <n-icon :component="Refresh" :size="12" />
          事件流已断开 · 重连
        </button>
        <span v-else-if="chatStore.streamStatus === 'reconnecting'" class="reconnect-tip">重连中…</span>
      </template>
      <span v-else class="app-title">Coding Agent</span>

      <div class="spacer" />

      <button class="icon-btn" :title="isDark ? '切换浅色主题' : '切换深色主题'" @click="toggle">
        <n-icon :component="isDark ? Sunny : Moon" :size="16" />
      </button>
    </header>

    <div class="chat-body">
      <div v-if="current" class="stream-area">
        <MessageStream />
      </div>
      <div v-else class="empty-area">
        <EmptyState
          title="开始你的第一个任务"
          desc="点击文件夹图标选择工作目录，输入任务并发送，将自动创建会话并开始执行"
        />
      </div>

      <template v-if="current">
        <UsageBar />
        <ChangeStrip />
      </template>
      <ChatInput />
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 64px; /* 与左侧栏头部同高，保证图标/文字在同一水平线 */
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.app-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-left: 4px;
}

.session-meta {
  display: flex;
  align-items: baseline;
  gap: 22px;
  min-width: 0;
  margin-left: 4px;
}
.s-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 320px;
}
.s-ws {
  font-size: 12px;
  color: var(--text-tertiary);
  max-width: 240px;
  min-width: 0;
}

.reconnect-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid color-mix(in srgb, var(--warning) 45%, transparent);
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.reconnect-btn:hover {
  border-color: var(--warning);
}
.reconnect-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.spacer {
  flex: 1;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-tertiary); /* 与侧栏收起按钮同色 */
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.chat-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.stream-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.empty-area {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  /* 提示内容整体下移一点 */
  padding-top: 90px;
}
</style>
