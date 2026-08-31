<script setup>
// diff 行级高亮：整行色带 + 行首 +/- 实色字符，等宽字体
import { computed } from 'vue'
import { parseDiff, buildSimpleDiff } from '@/utils/diff'

const props = defineProps({
  diff: { type: String, default: '' },
  oldContent: { type: String, default: '' },
  newContent: { type: String, default: '' },
  /** 显示行号 */
  showLineNumbers: { type: Boolean, default: false },
  /** 仅展示有差异的行（过滤上下文行），用于"对比"精简视图 */
  onlyChanges: { type: Boolean, default: false },
  /** 最大高度（超出滚动）；传 "none" 不限制（由外层容器控制） */
  maxHeight: { type: String, default: '260px' },
})

const lines = computed(() => {
  // 对比视图（onlyChanges）：忽略后端 diff 文本，基于完整的 old/new 内容重建逐行差异，
  // 保证差异完整（如空文件 → 新文件时显示完整的新文件）
  if (props.onlyChanges) {
    const list = buildSimpleDiff(props.oldContent, props.newContent)
    // 红绿交替：旧行（红）与新行（绿）逐对交替（旧1 新1 旧2 新2 …）
    const dels = list.filter((l) => l.type === 'del')
    const adds = list.filter((l) => l.type === 'add')
    const merged = []
    const n = Math.max(dels.length, adds.length)
    for (let i = 0; i < n; i++) {
      if (dels[i]) merged.push(dels[i])
      if (adds[i]) merged.push(adds[i])
    }
    return merged
  }
  // 提供完整 old/new 内容时优先重建（后端 diff 可能是截断预览，
  // 如只给前 10 行 + "… (共 N 行)"），保证完整可滚动查看
  if (props.oldContent != null || props.newContent != null) {
    return buildSimpleDiff(props.oldContent, props.newContent)
  }
  const parsed = parseDiff(props.diff)
  return parsed.length ? parsed : []
})
</script>

<template>
  <div class="diff-view mono" :style="{ maxHeight }">
    <div v-for="(line, i) in lines" :key="i" class="row" :class="line.type">
      <span v-if="showLineNumbers" class="ln">{{ i + 1 }}</span>
      <span class="marker">{{ line.text.charAt(0) }}</span>
      <span class="text">{{ line.text.slice(1) }}</span>
    </div>
  </div>
</template>

<style scoped>
.diff-view {
  font-size: 12px;
  line-height: 1.55;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  /* 内容超出时出现滚动条（max-height 由 prop 控制，滚动条由全局样式控制） */
  overflow-y: auto;
}
.row {
  display: flex;
  align-items: flex-start;
  padding: 0 10px;
  white-space: pre-wrap;
  word-break: break-all;
}
.row:hover {
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
}
.marker {
  flex-shrink: 0;
  width: 1.2em;
  user-select: none;
}
.text {
  flex: 1;
  min-width: 0;
}

/* 行级色带 */
.row.add {
  background: color-mix(in srgb, var(--success) 9%, transparent);
}
.row.add .marker {
  color: var(--success);
  font-weight: 700;
}
.row.del {
  background: color-mix(in srgb, var(--danger) 8%, transparent);
}
.row.del .marker {
  color: var(--danger);
  font-weight: 700;
}
.row.meta,
.row.hunk {
  background: color-mix(in srgb, var(--primary) 7%, transparent);
  color: var(--text-tertiary);
}
.row.ctx {
  color: var(--text-secondary);
}

.ln {
  flex-shrink: 0;
  width: 2.4em;
  margin-right: 8px;
  border-right: 1px solid var(--border);
  color: var(--text-tertiary);
  text-align: right;
  user-select: none;
}
</style>
