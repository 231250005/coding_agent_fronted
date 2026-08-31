<script setup>
// 消息流：吸底滚动容器 + 条目渲染
import { computed, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import { useAutoScroll } from '@/composables/useAutoScroll'
import MessageItem from './MessageItem.vue'

const chatStore = useChatStore()
const container = ref(null)
const { onScroll, scrollToBottom } = useAutoScroll(() => container.value)

// 追踪流版本：条目数 / 末条 id / 末条内容长度变化时吸底
const last = computed(() => chatStore.items[chatStore.items.length - 1])
const version = computed(() => {
  const l = last.value
  if (!l) return '0:0:0'
  const len = l.kind === 'tool' ? (l.output || '').length : (l.content || '').length
  return `${chatStore.items.length}:${l.id}:${len}`
})
watch(version, () => scrollToBottom())
</script>

<template>
  <div ref="container" class="stream" @scroll="onScroll">
    <div class="inner">
      <MessageItem v-for="item in chatStore.items" :key="item.id" :item="item" @typing="scrollToBottom" />
      <div v-if="chatStore.running" class="running-line">
        <span class="pulse" />agent 正在执行任务…
      </div>
    </div>
  </div>
</template>

<style scoped>
.stream {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 32px 16px;
}

.running-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12.5px;
  color: var(--text-tertiary);
}
.pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
</style>
