<script setup>
// 工作区列表单项：文件夹图标（置顶才有颜色）+ 标题/工作目录 + 正右方 ⋮ 菜单（置顶/重命名/删除）
import { computed, h } from 'vue'
import { NIcon, NDropdown } from 'naive-ui'
import { StarOutline, PencilOutline, TrashOutline, EllipsisVertical, FolderOpenOutline } from '@vicons/ionicons5'
import { relTime } from '@/utils/time'

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
  /** 该会话是否正在运行任务（标题后显示绿色脉冲点） */
  running: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'pin', 'rename', 'remove'])

// naive 的 icon 字段需要渲染函数（直接传组件会渲染成空白）
const optIcon = (comp) => () => h(NIcon, { component: comp, size: 14 })

const dropdownOptions = computed(() => [
  { label: props.session.is_pinned ? '取消置顶' : '置顶', key: 'pin', icon: optIcon(StarOutline) },
  { label: '重命名', key: 'rename', icon: optIcon(PencilOutline) },
  { label: '删除', key: 'remove', icon: optIcon(TrashOutline) },
])

function onSelectOption(key) {
  if (key === 'pin') emit('pin')
  else if (key === 'rename') emit('rename')
  else if (key === 'remove') emit('remove')
}
</script>

<template>
  <div class="item" :class="{ active, pinned: session.is_pinned }" @click="emit('select', session.id)">
    <!-- 文件夹图标：普通透明；置顶时才有颜色 -->
    <span class="icon-box">
      <n-icon :component="FolderOpenOutline" :size="16" />
    </span>

    <div class="content">
      <div class="line1">
        <span class="title ellipsis">{{ session.title || '(未命名工作区)' }}</span>
        <span v-if="running" class="run-dot" title="任务运行中" />
      </div>
      <div class="line2">
        <span class="ws mono ellipsis">{{ session.workspace }}</span>
      </div>
    </div>

    <!-- 正右方操作：⋮ 菜单（置顶/重命名/删除） -->
    <div class="side-actions">
      <n-dropdown trigger="click" placement="right-start" :options="dropdownOptions" :show-arrow="true" @select="onSelectOption">
        <button class="act" title="更多操作" @click.stop>
          <n-icon :component="EllipsisVertical" :size="15" />
        </button>
      </n-dropdown>
    </div>
  </div>
</template>

<style scoped>
.item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.item:hover {
  background: var(--bg-hover);
}
.item.active {
  background: var(--primary-soft);
  box-shadow: inset 2.5px 0 0 var(--primary);
}

/* 文件夹图标：默认透明灰色；置顶时浅色下金色、深色下主色蓝（更搭深色背景） */
.icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  background: transparent;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.item.pinned .icon-box {
  color: var(--warning);
  background: var(--warning-soft);
}
:root[data-theme='dark'] .item.pinned .icon-box {
  color: var(--primary);
  background: var(--primary-soft);
}

.content {
  flex: 1;
  min-width: 0;
}

.line1 {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 0;
}

/* 运行中的绿色脉冲点（会话名后） */
.run-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  flex-shrink: 0;
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

.line2 {
  display: flex;
  align-items: center;
  margin-top: 3px;
  min-width: 0;
}
.ws {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 0;
}

/* 正右方操作列 */
.side-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity 0.15s ease;
}
.item:hover .side-actions,
.item.active .side-actions {
  opacity: 1;
}
.act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.act:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
