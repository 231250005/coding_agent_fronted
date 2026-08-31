<script setup>
// 工具调用卡片：左缘状态色条 + 名称 + 参数/输出折叠
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { Checkmark, Close, ChevronDown, ChevronForward } from '@vicons/ionicons5'
import { prettyJson } from '@/utils/format'

const props = defineProps({
  tool: { type: Object, required: true }, // {name, args, ok:null|bool, output, orphan}
})

const expanded = ref(false)

const argsText = computed(() => prettyJson(props.tool.args))
const showArgs = computed(() => argsText.value.length > 0)
const outputLines = computed(() => (props.tool.output || '').split('\n'))
const hasOutput = computed(() => outputLines.value.length > 0)
const outputClamped = computed(() => outputLines.value.length > 200)
const hasContent = computed(() => showArgs.value || hasOutput.value)
const statusClass = computed(() =>
  props.tool.ok === null ? 'pending' : props.tool.ok ? 'ok' : 'fail',
)
</script>

<template>
  <div class="tool-card" :class="statusClass">
    <div class="tool-head" @click="expanded = !expanded">
      <span class="status-icon">
        <span v-if="tool.ok === null" class="spinner" />
        <n-icon v-else-if="tool.ok" :component="Checkmark" :size="13" class="ok" />
        <n-icon v-else :component="Close" :size="13" class="fail" />
      </span>
      <span class="tool-name mono">{{ tool.name }}</span>
      <span v-if="tool.orphan" class="orphan-tag">独立结果</span>
      <span class="spacer" />
      <n-icon v-if="hasContent" :component="expanded ? ChevronDown : ChevronForward" :size="13" class="arrow" />
    </div>

    <div v-if="expanded" class="tool-body">
      <div v-if="showArgs" class="section">
        <div class="section-label">参数</div>
        <pre class="block mono">{{ argsText }}</pre>
      </div>
      <div v-if="hasOutput" class="section">
        <div class="section-label">输出</div>
        <pre v-if="outputClamped" class="block mono">{{ outputLines.slice(0, 200).join('\n') }}\n… 输出已截断（共 {{ outputLines.length }} 行）</pre>
        <pre v-else class="block mono">{{ tool.output }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-card {
  border: 1px solid var(--border);
  border-left: 2px solid var(--tool-idle);
  border-radius: 8px;
  background: var(--bg-surface);
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}
.tool-card:hover {
  box-shadow: var(--shadow-card-hover);
}
.tool-card.ok {
  border-left-color: var(--tool-ok);
}
.tool-card.fail {
  border-left-color: var(--tool-fail);
}

.tool-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  user-select: none;
}
.tool-head:hover {
  background: var(--bg-hover);
}

.status-icon {
  display: inline-flex;
  align-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.ok {
  color: var(--tool-ok);
}
.fail {
  color: var(--tool-fail);
}

.spinner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--tool-idle) 30%, transparent);
  border-top-color: var(--tool-idle);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tool-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}
.orphan-tag {
  font-size: 11px;
  color: var(--text-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 5px;
}
.spacer {
  flex: 1;
}
.arrow {
  color: var(--text-tertiary);
}

.tool-body {
  padding: 0 12px 10px;
}
.section {
  margin-top: 8px;
}
.section-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}
.block {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-subtle);
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
}
</style>
