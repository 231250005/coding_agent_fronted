<script setup>
// 上下文用量条：tokens 进度（相对可配置预算）+ LLM 调用次数
import { computed } from 'vue'
import { CONTEXT_BUDGET } from '@/config'
import { formatTokens } from '@/utils/format'
import { useChatStore } from '@/stores/chatStore'

const chatStore = useChatStore()
const u = computed(() => chatStore.usage)

const pct = computed(() => {
  const ctx = u.value?.context_tokens || 0
  return Math.min(100, (ctx / CONTEXT_BUDGET) * 100)
})

const danger = computed(() => pct.value >= 85)
</script>

<template>
  <div v-if="u" class="usage">
    <div class="progress">
      <div class="bar" :class="{ danger }" :style="{ width: pct + '%' }" />
    </div>
    <div class="meta">
      <span>上下文 {{ formatTokens(u.context_tokens) }} / {{ formatTokens(CONTEXT_BUDGET) }} tokens</span>
    </div>
  </div>
</template>

<style scoped>
.usage {
  flex-shrink: 0;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  padding: 6px 32px 2px;
}
.progress {
  height: 3px;
  border-radius: 2px;
  background: var(--bg-subtle);
  overflow: hidden;
}
.bar {
  height: 100%;
  border-radius: 2px;
  background: var(--primary);
  transition: width 0.3s ease;
}
.bar.danger {
  background: var(--warning);
}
.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
}
.sep {
  color: var(--text-tertiary);
}
.dim {
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
