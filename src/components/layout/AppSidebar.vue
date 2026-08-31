<script setup>
// 左栏：品牌 + 新建工作区 + 分组会话列表（置顶/今日/一周内/一月内/更多）
import { computed, ref } from 'vue'
import { NButton, NIcon, NModal, NScrollbar, useMessage } from 'naive-ui'
import { Add, Sparkles, MenuOutline } from '@vicons/ionicons5'
import { useSessionStore } from '@/stores/sessionStore'
import { useChatStore } from '@/stores/chatStore'
import { useNewSessionModal } from '@/composables/useNewSessionModal'
import SessionItem from './SessionItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'

defineEmits(['collapse'])

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const message = useMessage()
const { openRename } = useNewSessionModal()

// 删除确认弹窗（自定义 modal，与重命名弹窗样式一致，无图标空白）
const delShow = ref(false)
const delTarget = ref(null)
const delLoading = ref(false)
const delName = computed(() => {
  const s = delTarget.value
  if (!s) return ''
  return (s.title || s.workspace).slice(0, 16)
})

function onDelete(session) {
  delTarget.value = session
  delShow.value = true
}

async function doDelete() {
  delLoading.value = true
  try {
    await sessionStore.remove(delTarget.value.id)
    delShow.value = false
  } catch (e) {
    message.error(e.message)
  } finally {
    delLoading.value = false
  }
}

/** 新建工作区：不弹窗，直接切到右侧新会话样式（发送时自动创建） */
function newSession() {
  sessionStore.setCurrent(null)
}

function onSelect(id) {
  sessionStore.setCurrent(id)
}

async function onPin(session, isPinned) {
  try {
    await sessionStore.pin(session.id, isPinned)
  } catch (e) {
    message.error(e.message)
  }
}

</script>

<template>
  <div class="sidebar">
    <div class="sidebar-head">
      <span class="logo"><n-icon :component="Sparkles" :size="15" /></span>
      <span class="brand">Coding Agent</span>
      <button class="collapse-btn" title="收起侧边栏" @click="$emit('collapse')">
        <n-icon :component="MenuOutline" :size="15" />
      </button>
    </div>

    <div class="sidebar-actions">
      <n-button block type="primary" size="large" class="new-btn" @click="newSession">
        <template #icon><n-icon :component="Add" :size="17" /></template>
        新建工作区
      </n-button>
    </div>

    <div v-if="sessionStore.sessions.length" class="list-title">工作区</div>

    <n-scrollbar v-if="sessionStore.sessions.length" class="sidebar-scroll">
      <div class="session-groups">
        <template v-for="g in sessionStore.groupedSessions" :key="g.key">
          <div class="group-head">
            <span class="group-title">{{ g.label }}</span>
            <span class="group-line" />
          </div>
          <div class="group-list">
            <SessionItem
              v-for="s in g.items"
              :key="s.id"
              :session="s"
              :active="s.id === sessionStore.currentId"
              :running="s.id === chatStore.runningSessionId && chatStore.running"
              @select="onSelect"
              @pin="onPin(s, !s.is_pinned)"
              @rename="openRename(s)"
              @remove="onDelete(s)"
            />
          </div>
        </template>
      </div>
    </n-scrollbar>

    <!-- 空状态：垂直居中显示在侧栏中部 -->
    <div v-else-if="sessionStore.loaded" class="empty-wrap">
      <EmptyState title="还没有工作区" desc="新建一个工作区，告诉 agent 你的编程任务" />
    </div>

    <!-- 删除确认弹窗：无图标、蓝色主按钮，与重命名弹窗一致 -->
    <n-modal v-model:show="delShow" preset="card" title="删除工作区" style="width: 400px" :bordered="false">
      <p class="del-msg">确定删除该工作区？相关聊天内容将一并删除。</p>
      <template #footer>
        <div class="del-actions">
          <n-button quaternary @click="delShow = false">取消</n-button>
          <n-button type="primary" :loading="delLoading" @click="doDelete">删除</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

/* 侧栏头部：高 64px 与右侧顶栏同一水平线；图标左上角、名称居中、收起靠右 */
.sidebar-head {
  position: relative;
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 14px;
  flex-shrink: 0;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, #a855f7));
  color: #fff;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 40%, transparent);
  flex-shrink: 0;
}

.brand {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  white-space: nowrap;
}

/* 收起按钮：方正透明大图标，悬停浅色底；与展开按钮同色（text-tertiary） */
.collapse-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.collapse-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar-actions {
  padding: 22px 16px 40px;
}

/* 新建工作区按钮：横向撑满左栏；与左上角项目图标同款蓝紫渐变背景 */
.new-btn {
  border-radius: 10px;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 40%, transparent);
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, #a855f7));
  color: #fff;
  border: none;
  letter-spacing: 0.5px;
}
.new-btn:hover {
  filter: brightness(1.08);
}

/* 列表区标题 */
.list-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-secondary);
  padding: 0 16px 8px;
}

.sidebar-scroll {
  flex: 1;
  min-height: 0;
}

/* 空状态：占满剩余高度，略微偏上（不完全垂直居中） */
.empty-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 90px;
}

.session-groups {
  padding: 0 8px 16px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 4px;
}
.group-title {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.group-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 删除确认弹窗 */
.del-msg {
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: nowrap; /* 压缩在一行 */
}
.del-actions {
  display: flex;
  justify-content: flex-end; /* 右下角 */
  gap: 8px;
  width: 100%;
}
</style>
