<script setup>
// 变更详情抽屉：diff / 旧内容 / 新内容 切换查看 + 状态操作
import { computed, ref, watch } from 'vue'
import { NButton, NDrawer, NDrawerContent, NIcon } from 'naive-ui'
import { Checkmark, Close, ArrowUndo } from '@vicons/ionicons5'
import { useChangeStore } from '@/stores/changeStore'
import DiffView from '@/components/common/DiffView.vue'
import { operationLabel } from '@/utils/format'
import { fullTime } from '@/utils/time'

const props = defineProps({
  show: { type: [Number, null], default: null }, // v-model:show 绑定 detailId
})

const emit = defineEmits(['update:show', 'confirm', 'reject', 'revert'])

const changeStore = useChangeStore()
const view = ref('diff') // diff | old | new

const change = computed(() => changeStore.items.find((c) => c.id === props.show) || null)

watch(
  () => props.show,
  (v) => {
    if (v) view.value = 'diff'
  },
)

const status = computed(() => (change.value ? change.value.status || 'pending' : 'pending'))

const canConfirm = computed(() => status.value === 'pending')
const canRevert = computed(() => status.value === 'applied')
</script>

<template>
  <n-drawer :show="!!change" :width="560" placement="right" @update:show="(v) => !v && emit('update:show', null)">
    <n-drawer-content v-if="change" closable>
      <template #header>
        <div class="drawer-title">
          <span class="file mono ellipsis">{{ change.file_path }}</span>
          <span class="op">{{ operationLabel(change.operation) }}</span>
        </div>
      </template>

      <div class="meta">
        <span>创建于 {{ fullTime(change.created_at) }}</span>
        <span v-if="change.confirmed_at"> · 确认于 {{ fullTime(change.confirmed_at) }}</span>
        <span v-if="change.reverted_at"> · 撤销于 {{ fullTime(change.reverted_at) }}</span>
      </div>

      <div class="view-tabs">
        <button class="view-tab" :class="{ active: view === 'diff' }" @click="view = 'diff'">对比</button>
        <button class="view-tab" :class="{ active: view === 'old' }" @click="view = 'old'">旧内容</button>
        <button class="view-tab" :class="{ active: view === 'new' }" @click="view = 'new'">新内容</button>
      </div>

      <div class="content">
        <DiffView
          v-if="view === 'diff'"
          :diff="change.diff"
          :old-content="change.old_content"
          :new-content="change.new_content"
          :only-changes="true"
          max-height="none"
        />
        <pre v-else-if="view === 'old'" class="mono text-view">{{ change.old_content || '(空文件)' }}</pre>
        <pre v-else class="mono text-view">{{ change.new_content || '(空文件)' }}</pre>
      </div>

      <template #footer>
        <div class="footer-actions">
          <span v-if="!canConfirm && !canRevert" class="foot-hint">该变更已处理，不可再操作</span>
          <template v-else>
            <n-button v-if="canConfirm" size="small" type="primary" @click="emit('confirm', change)">
              <template #icon><n-icon :component="Checkmark" :size="13" /></template>
              确认应用
            </n-button>
            <n-button v-if="canConfirm" size="small" @click="emit('reject', change)">
              <template #icon><n-icon :component="Close" :size="13" /></template>
              拒绝
            </n-button>
            <n-button v-if="canRevert" size="small" @click="emit('revert', change)">
              <template #icon><n-icon :component="ArrowUndo" :size="13" /></template>
              撤销此变更
            </n-button>
          </template>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.file {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 0;
}
.op {
  font-size: 11px;
  color: var(--text-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 5px;
  flex-shrink: 0;
}

.meta {
  font-size: 11.5px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.view-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--bg-subtle);
  margin-bottom: 10px;
}
.view-tab {
  border: none;
  background: transparent;
  padding: 4px 14px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.view-tab.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: var(--shadow-card);
}

.content {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
}

.text-view {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.foot-hint {
  font-size: 12.5px;
  color: var(--text-tertiary);
}
</style>
