<script setup>
// 双栏布局（Claude Code 风格）：左侧会话栏 + 右侧对话区
// 弹窗编排（渲染于 NMessageProvider 内部，可直接 useMessage/useDialog）
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useSessionStore } from '@/stores/sessionStore'
import { useChatStore } from '@/stores/chatStore'
import { useNewSessionModal } from '@/composables/useNewSessionModal'
import { useActiveSession } from '@/composables/useActiveSession'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import NewSessionModal from '@/components/layout/NewSessionModal.vue'

const message = useMessage()
const sessionStore = useSessionStore()
const chatStore = useChatStore()

// 会话切换编排（全局一次）：重置聊天 + 载历史 + 载变更 + 连 SSE
useActiveSession()

// 左侧栏折叠状态
const sidebarCollapsed = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 新建 / 重命名弹窗（解构到顶层 ref，模板中才能正确解包）
const { show: createShow, session: renameTarget, close: closeModal } = useNewSessionModal()

async function onCreated({ workspace, title }) {
  try {
    const s = await sessionStore.create(workspace, title)
    closeModal()
    sessionStore.setCurrent(s.id)
  } catch (e) {
    message.error(e.message)
  }
}

async function onRenamed({ id, title }) {
  try {
    await sessionStore.rename(id, title)
    closeModal()
  } catch (e) {
    message.error(e.message)
  }
}

onMounted(() => {
  sessionStore.load().catch((e) => message.error('无法加载会话列表：' + e.message))
})

onBeforeUnmount(() => {
  chatStore.closeStream()
})
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <AppSidebar @collapse="toggleSidebar" />
    </aside>

    <main class="app-main">
      <ChatPanel :sidebar-collapsed="sidebarCollapsed" @toggle-sidebar="toggleSidebar" />
    </main>

    <NewSessionModal v-model:show="createShow" :session="renameTarget" @created="onCreated" @renamed="onRenamed" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.app-sidebar {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--bg-surface);
  transition: width 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
}
.app-sidebar.collapsed {
  width: 0;
  border-right: none;
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}
</style>
