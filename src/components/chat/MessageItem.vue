<script setup>
// 消息条目分发器：按 kind 渲染不同形态；assistant 消息逐字流式展示（打字机）
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NIcon } from 'naive-ui'
import { AlertCircle, Sparkles } from '@vicons/ionicons5'
import { useChatStore } from '@/stores/chatStore'
import { relTime } from '@/utils/time'
import ThinkingBlock from './ThinkingBlock.vue'
import ToolCallCard from './ToolCallCard.vue'
import ConfirmCard from './ConfirmCard.vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const emit = defineEmits(['typing'])

const chatStore = useChatStore()

// 最后一条 thinking 处于活动状态时显示脉冲点
const thinkingActive = computed(
  () => props.item.kind === 'thinking' && chatStore.running && chatStore.items[chatStore.items.length - 1]?.id === props.item.id,
)

// ---------------- assistant 打字机（逐字流式） ----------------
const displayLen = ref(null) // null = 直接全显（历史消息/已结束）
let typeTimer = null

watch(
  () => props.item,
  (it) => {
    clearInterval(typeTimer)
    if (it.kind === 'assistant' && it.streaming) {
      // 从上次已打字位置继续（缓存恢复时不重播）
      displayLen.value = it.typedLen ?? 0
      typeTimer = setInterval(() => {
        displayLen.value += 1
        it.typedLen = displayLen.value // 记录进度，供缓存恢复续打
        emit('typing') // 通知消息流吸底跟随
        if (displayLen.value >= (it.content || '').length) {
          clearInterval(typeTimer)
          it.streaming = false // 标记完成
        }
      }, 18)
    } else {
      displayLen.value = null
    }
  },
  { immediate: true },
)

const assistantText = computed(() => {
  if (displayLen.value == null) return props.item.content
  return (props.item.content || '').slice(0, displayLen.value)
})

// ---------------- 相对时间（每分钟刷新） ----------------
const now = ref(Date.now())
let timeTimer = setInterval(() => (now.value = Date.now()), 60000)

onBeforeUnmount(() => {
  clearInterval(typeTimer)
  clearInterval(timeTimer)
})

const itemTime = computed(() => relTime(props.item.at, now.value))
</script>

<template>
  <div class="msg" :class="'kind-' + item.kind">
    <!-- 用户任务：右侧主色浅底气泡；相对时间在气泡下方 -->
    <template v-if="item.kind === 'user'">
      <div class="row user-row">
        <div class="user-msg">
          <div class="bubble">
            <div class="bubble-text">{{ item.content }}</div>
          </div>
          <div class="bubble-time">{{ itemTime }}</div>
        </div>
      </div>
    </template>

    <!-- agent 最终回答：项目同款头像 + 左对齐无气泡纯文本（逐字流式，底部附相对时间） -->
    <div v-else-if="item.kind === 'assistant'" class="row assistant-row">
      <span class="agent-avatar" title="Coding Agent"><n-icon :component="Sparkles" :size="13" /></span>
      <div class="assistant-body">
        <div class="assistant-text">{{ assistantText }}</div>
        <div class="assistant-time">{{ itemTime }}</div>
      </div>
    </div>

    <!-- 思考过程（逐字流式，typing 冒泡给消息流吸底） -->
    <ThinkingBlock v-else-if="item.kind === 'thinking'" :item="item" :active="thinkingActive" @typing="emit('typing')" />

    <!-- 工具调用卡片 -->
    <ToolCallCard v-else-if="item.kind === 'tool'" :tool="item" />

    <!-- L1 确认卡片 -->
    <ConfirmCard v-else-if="item.kind === 'confirm'" :card="item" />

    <!-- 错误 -->
    <div v-else-if="item.kind === 'error'" class="error-block">
      <n-icon :component="AlertCircle" :size="15" />
      <span>{{ item.content }}</span>
    </div>

    <!-- 系统提示（任务统计 / 上下文压缩等） -->
    <div v-else-if="item.kind === 'system'" class="system-line" :class="{ dim: item.level === 'dim' }">
      {{ item.text }}
    </div>
  </div>
</template>

<style scoped>
.msg {
  margin-bottom: 20px;
}

.row {
  display: flex;
}

/* 用户气泡 */
.user-row {
  justify-content: flex-end;
}
.user-msg {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 85%;
}
.bubble {
  background: var(--primary-soft);
  border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
  border-radius: 12px 12px 4px 12px;
  padding: 10px 14px;
}
.bubble-text {
  font-size: 14px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 消息相对时间（气泡下方小字） */
.bubble-time {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}

/* agent 回答 */
.assistant-row {
  justify-content: flex-start;
  align-items: flex-start;
  gap: 10px;
}
.agent-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #8b5cf6));
  color: #fff;
  flex-shrink: 0;
  margin-top: 2px;
  box-shadow: var(--shadow-card);
}
.assistant-body {
  flex: 1;
  min-width: 0;
}
.assistant-text {
  font-size: 14px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}
.assistant-time {
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-tertiary);
}

/* 错误块 */
.error-block {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 13px;
  line-height: 1.5;
}
.error-block .n-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* 系统行 */
.system-line {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 2px 0;
}
.system-line.dim {
  color: var(--text-tertiary);
}
</style>
