<script setup>
// L1 确认卡片（内嵌消息流）：diff 预览 + 确认/拒绝
import { computed, ref } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import { useChatStore } from '@/stores/chatStore'
import { useChangeStore } from '@/stores/changeStore'
import DiffView from '@/components/common/DiffView.vue'

const props = defineProps({
  card: { type: Object, required: true }, // {changeId, filePath, operation, diff, status, busy}
})

const chatStore = useChatStore()
const changeStore = useChangeStore()
const message = useMessage()
const resolving = ref(false)

// 从变更列表取该 change 的完整 old/new 内容（后端 diff 预览是截断的）
const changeInfo = computed(() => changeStore.items.find((c) => c.id === props.card.changeId))

async function resolve(action) {
  if (resolving.value) return
  resolving.value = true
  try {
    await chatStore.resolveConfirm(props.card.changeId, action)
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    resolving.value = false
  }
}
</script>

<template>
  <div class="confirm-card">
    <div class="head">
      <span class="title">等待你的确认</span>
      <span class="file mono ellipsis">{{ card.filePath }}</span>
    </div>

    <div class="diff">
      <!-- 完整内容重建：old/new 来自变更列表（后端 diff 预览仅前 10 行） -->
      <DiffView
        :diff="card.diff"
        :old-content="changeInfo?.old_content ?? ''"
        :new-content="changeInfo?.new_content ?? ''"
      />
    </div>

    <div class="actions">
      <n-button size="small" :loading="resolving" @click="resolve('reject')">
        拒绝
      </n-button>
      <n-button size="small" type="primary" :loading="resolving" @click="resolve('confirm')">
        确认
      </n-button>
    </div>
  </div>
</template>

<style scoped>
/* 与其它消息卡片一致：无彩色背景，普通边框 + 表面色 */
.confirm-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  padding: 10px 12px;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.file {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 220px;
  min-width: 0;
}

/* diff 滚动交给 DiffView 内部（max-height + overflow-y auto） */
.diff {
  margin-top: 10px;
  border-radius: 8px;
}

/* 按钮右下角 */
.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
</style>
