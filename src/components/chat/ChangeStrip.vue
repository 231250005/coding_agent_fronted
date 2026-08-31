<script setup>
// 输入框上方的文件变更区（Claude Code 风格）：
// 默认收起为一个"文件变更 N"按钮，点击展开文件列表；每个文件行带操作按钮
// - pending：确认 / 拒绝（L1 暂停恢复的兜底入口）
// - applied：撤销
// - 所有状态：对比（查看原文件与当前文件的差异）
import { computed, ref, watch } from 'vue'
import { NButton, NIcon, NModal, NTag, useMessage } from 'naive-ui'
import {
  Checkmark,
  Close,
  ArrowUndo,
  DocumentTextOutline,
  AlertCircle,
} from '@vicons/ionicons5'
import { useChangeStore } from '@/stores/changeStore'
import { useChatStore } from '@/stores/chatStore'
import { operationLabel, normalizeStatus } from '@/utils/format'
import ChangeDetailDrawer from '@/components/common/ChangeDetailDrawer.vue'
import DiffView from '@/components/common/DiffView.vue'

const changeStore = useChangeStore()
const chatStore = useChatStore()
const message = useMessage()

const expanded = ref(false)
// L1 待确认的变更只走消息流确认卡片，不在下方变更区展示
const visibleItems = computed(() => changeStore.items.filter((c) => normalizeStatus(c.status) !== 'pending'))
const hasChanges = computed(() => visibleItems.value.length > 0)

// 可见变更从无到有时自动展开（任务完成后新结果可见）
watch(
  () => visibleItems.value.length,
  (n, prev) => {
    if (n > 0 && prev === 0 && chatStore.sessionId) expanded.value = true
  },
)

async function confirmChange(c) {
  try {
    await changeStore.confirm(c.id)
  } catch (e) {
    message.error(e.message)
  }
}

async function rejectChange(c) {
  try {
    await changeStore.reject(c.id)
  } catch (e) {
    message.error(e.message)
  }
}

// 撤销冲突弹窗状态（409 + conflict:true：文件已被其他修改）
const conflictShow = ref(false)
const conflictCurrent = ref('')
const conflictExpected = ref('')

async function revertChange(c) {
  try {
    await changeStore.revert(c.id)
  } catch (e) {
    if (e.status === 409 && e.conflict) {
      // 文件已被其他修改，未撤销：展示 current/expected 差异
      conflictCurrent.value = e.current ?? ''
      conflictExpected.value = e.expected ?? ''
      conflictShow.value = true
    } else {
      message.error(e.message)
    }
  }
}

function compare(c) {
  changeStore.detailId = c.id
}

/** 撤销全部：对每个已应用变更依次撤销（冲突项跳过；无成功提示） */
async function revertAll() {
  const applied = changeStore.items.filter((c) => normalizeStatus(c.status) === 'applied')
  if (!applied.length) return
  for (const c of applied) {
    try {
      await changeStore.revert(c.id)
    } catch (e) {
      // 冲突项静默跳过（无提示），其余失败报错
      if (!(e.status === 409 && e.conflict)) message.error(`撤销 ${c.file_path} 失败：${e.message}`)
    }
  }
}

/** 保存全部：调用后端 confirm-all，确认全部变更并删除记录（无成功提示） */
async function confirmAll() {
  const sessionId = chatStore.sessionId
  if (!sessionId || !changeStore.items.length) return
  try {
    await changeStore.confirmAll(sessionId)
  } catch (e) {
    message.error(e.message)
  }
}
</script>

<template>
  <div v-if="hasChanges" class="change-strip">
    <!-- 列表在按钮上方展开（上拉栏） -->
    <transition name="fade">
      <div v-if="expanded" class="strip-list">
        <div class="strip-toolbar">
          <span class="toolbar-hint">共 {{ visibleItems.length }} 项变更</span>
          <div class="spacer" />
          <n-button size="tiny" quaternary @click="revertAll">撤销全部</n-button>
          <n-button size="tiny" quaternary class="confirm-all-btn" @click="confirmAll">保存全部</n-button>
        </div>
        <div v-for="c in visibleItems" :key="c.id" class="strip-row" :class="{ dimmed: normalizeStatus(c.status) === 'reverted' || normalizeStatus(c.status) === 'rejected' }">
          <n-icon :component="DocumentTextOutline" :size="14" class="file-icon" />
          <span class="file mono ellipsis">{{ c.file_path }}</span>
          <span class="op">{{ operationLabel(c.operation) }}</span>
          <!-- 已应用是常态不贴标签；仅待确认（L1 暂停）与已拒绝需要标识 -->
          <n-tag v-if="normalizeStatus(c.status) === 'pending'" type="warning" size="small" :bordered="false">待确认</n-tag>
          <n-tag v-else-if="normalizeStatus(c.status) === 'rejected'" type="error" size="small" :bordered="false">已拒绝</n-tag>
          <div class="spacer" />

          <template v-if="normalizeStatus(c.status) === 'pending'">
            <n-button size="tiny" type="primary" secondary @click="confirmChange(c)">确认</n-button>
            <n-button size="tiny" @click="rejectChange(c)">拒绝</n-button>
          </template>
          <n-button v-else-if="normalizeStatus(c.status) === 'applied'" size="tiny" quaternary @click="revertChange(c)">
            <template #icon><n-icon :component="ArrowUndo" :size="12" /></template>
            撤销
          </n-button>
          <n-button size="tiny" quaternary @click="compare(c)">对比</n-button>
        </div>
      </div>
    </transition>

    <!-- 收起/展开按钮（列表在按钮上方展开） -->
    <button class="strip-toggle" :class="{ open: expanded }" @click="expanded = !expanded">
      文件变更
    </button>

    <ChangeDetailDrawer
      v-model:show="changeStore.detailId"
      @confirm="confirmChange"
      @reject="rejectChange"
      @revert="revertChange"
    />

    <!-- 撤销冲突弹窗：文件已被其他修改，展示 current/expected 差异 -->
    <n-modal v-model:show="conflictShow" preset="card" title="撤销冲突" style="width: 560px" :bordered="false">
      <div class="conflict-msg">
        <n-icon :component="AlertCircle" :size="15" />
        <span>文件已被其他修改，未撤销。以下是文件当前内容与期望内容（撤销目标）的差异：</span>
      </div>
      <div class="conflict-diff">
        <DiffView :old-content="conflictExpected" :new-content="conflictCurrent" />
      </div>
      <template #footer>
        <div class="conflict-footer">
          <n-button size="small" type="primary" @click="conflictShow = false">知道了</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.change-strip {
  flex-shrink: 0;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 4px 32px 0;
  /* DOM 顺序：列表在前、按钮在后（普通文档流即列表在上、按钮在下） */
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.strip-toggle {
  display: flex;
  align-items: center;
  justify-content: center; /* 文字居中 */
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.strip-toggle:hover,
.strip-toggle.open {
  border-color: var(--border-strong);
  background: var(--bg-hover);
}

.strip-list {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
}

/* 操作栏：撤销全部 / 保存全部 */
.strip-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-subtle);
}
.toolbar-hint {
  font-size: 11.5px;
  color: var(--text-tertiary);
}
/* 保存全部：与撤销全部同款（无底色），仅加一层细线条边框 */
.confirm-all-btn {
  border: 1px solid var(--border-strong) !important;
}
.confirm-all-btn:hover {
  border-color: var(--primary) !important;
}

.strip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px solid var(--border);
}
.strip-row:last-child {
  border-bottom: none;
}
.strip-row:hover {
  background: var(--bg-hover);
}
.strip-row.dimmed {
  opacity: 0.55;
}

.file-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.file {
  font-size: 12.5px;
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
.spacer {
  flex: 1;
}

/* 撤销冲突弹窗 */
.conflict-msg {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--danger);
  margin-bottom: 10px;
  line-height: 1.5;
}
.conflict-msg .n-icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.conflict-diff {
  max-height: 320px;
  overflow-y: auto;
  border-radius: 8px;
}
.conflict-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
