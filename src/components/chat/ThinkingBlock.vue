<script setup>
// 思考过程：灰色文字全部展示（不折叠），逐字流式输出（打字机）
// - 运行中：内容分段追加，打字机跟随增长
// - 任务结束（streaming=false）：剩余内容直接全显，不再流式
// - 缓存恢复：从已打字位置（typedLen）续打，不重播
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NIcon } from 'naive-ui'

const props = defineProps({
  /** thinking 条目对象（直接读写 typedLen / streaming） */
  item: { type: Object, required: true },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['typing'])

// ---------------- 逐字流式（打字机） ----------------
const displayLen = ref(props.item.typedLen ?? 0)
let typeTimer = null

function tickLoop() {
  if (typeTimer) return // 已在打字中
  if (!props.item.streaming) {
    displayLen.value = props.item.content.length // 非流式：直接全显
    return
  }
  typeTimer = setInterval(() => {
    displayLen.value += 1
    props.item.typedLen = displayLen.value // 记录进度，供缓存恢复续打
    emit('typing') // 通知消息流吸底跟随
    if (displayLen.value >= props.item.content.length) {
      clearInterval(typeTimer)
      typeTimer = null // 打完了，等下次内容追加再继续
    }
  }, 18)
}

watch(() => props.item.content, tickLoop, { immediate: true })

// 任务结束 → 停止流式，剩余直接全显
watch(
  () => props.item.streaming,
  (v) => {
    if (!v) {
      clearInterval(typeTimer)
      typeTimer = null
      displayLen.value = props.item.content.length
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => clearInterval(typeTimer))

const shown = computed(() => props.item.content.slice(0, displayLen.value))
</script>

<template>
  <div class="thinking">
    <div class="head">
      <span class="pulse" :class="{ on: active }" />
      <span class="label">思考</span>
    </div>
    <div class="body">{{ shown }}</div>
  </div>
</template>

<style scoped>
.thinking {
  padding: 2px 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
}
.pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-tertiary);
}
.pulse.on {
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
.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 1px;
}
.body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  border-left: 2px solid var(--border);
  padding-left: 12px;
  margin-left: 3px;
}
</style>
