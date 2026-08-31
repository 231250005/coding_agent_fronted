<script setup>
// 权限徽标：默认（琥珀）/ 代理（蓝）/ 自动（紫），面向普通用户的模式名 + 语义 tooltip
import { computed } from 'vue'
import { NTooltip } from 'naive-ui'
import { PERM_META } from '@/utils/format'

const props = defineProps({
  level: { type: [Number, String], required: true },
  /** 悬停时展示语义 tooltip */
  showTip: { type: Boolean, default: true },
  /** 徽标文字后追加的补充（如「任务」） */
  suffix: { type: String, default: '' },
})

const meta = computed(() => PERM_META[Number(props.level)] || PERM_META[2])
</script>

<template>
  <n-tooltip v-if="showTip" trigger="hover">
    <template #trigger>
      <span class="perm-badge" :class="meta.cls">
        {{ meta.short }}<template v-if="suffix">·{{ suffix }}</template>
      </span>
    </template>
    {{ meta.level }} 权限 · {{ meta.desc }}
  </n-tooltip>
  <span v-else class="perm-badge" :class="meta.cls">
    {{ meta.short }}<template v-if="suffix">·{{ suffix }}</template>
  </span>
</template>

<style scoped>
.perm-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
}
.perm-l1 {
  color: var(--perm-l1-text);
  background: var(--perm-l1-bg);
  border: 1px solid var(--perm-l1-border);
}
.perm-l2 {
  color: var(--perm-l2-text);
  background: var(--perm-l2-bg);
  border: 1px solid var(--perm-l2-border);
}
.perm-l3 {
  color: var(--perm-l3-text);
  background: var(--perm-l3-bg);
  border: 1px solid var(--perm-l3-border);
}
</style>
