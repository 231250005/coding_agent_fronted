<script setup>
// 工作目录选择器：目录树浏览（依赖后端 GET /api/fs/dirs）
// 后端接口不可用时显示降级提示（改用拖拽或手动输入）
import { ref, watch } from 'vue'
import { NButton, NIcon, NModal, NSpin, useMessage } from 'naive-ui'
import { FolderOpenOutline, ChevronForward, ArrowUp, Checkmark } from '@vicons/ionicons5'
import { listDirs } from '@/api/fs'

const props = defineProps({
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'select'])

const message = useMessage()

const currentPath = ref('') // 当前浏览目录
const parent = ref('') // 上级目录
const dirs = ref([]) // 子目录列表
const loading = ref(false)
const apiAvailable = ref(true) // 后端是否支持目录浏览

async function browse(path = '') {
  loading.value = true
  try {
    const data = await listDirs(path)
    apiAvailable.value = true
    currentPath.value = data.path || ''
    parent.value = data.parent || ''
    dirs.value = data.dirs || []
  } catch (e) {
    if (e.status === 404 || e.status === 500 || e.status === 400) {
      apiAvailable.value = false
    }
    if (path) message.error(e.message)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (v) => {
    if (v) browse('')
  },
)

function enter(dir) {
  browse(dir.path)
}

function goUp() {
  if (parent.value) browse(parent.value)
}

function select() {
  if (!currentPath.value) return
  emit('select', currentPath.value)
  emit('update:show', false)
}

// 浏览器原生选择器兜底（后端无接口时）
async function nativePick() {
  if (typeof window.showDirectoryPicker !== 'function') {
    message.warning('当前浏览器不支持文件夹选择，请手动输入路径或拖拽文件夹到输入框')
    return
  }
  try {
    const handle = await window.showDirectoryPicker()
    emit('select', handle.name)
    emit('update:show', false)
  } catch (e) {
    if (e.name !== 'AbortError') message.error('选择失败：' + e.message)
  }
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="选择工作目录"
    style="width: 520px"
    :bordered="false"
    @update:show="(v) => emit('update:show', v)"
  >
    <div v-if="!apiAvailable" class="fallback">
      <p>后端暂未提供目录浏览接口（GET /api/fs/dirs）。</p>
      <n-button size="small" @click="nativePick">改用系统文件夹选择器</n-button>
    </div>

    <template v-else>
      <div class="path-bar">
        <n-button size="small" quaternary circle title="返回上级" :disabled="!parent" @click="goUp">
          <n-icon :component="ArrowUp" :size="14" />
        </n-button>
        <div class="path mono ellipsis" :title="currentPath">{{ currentPath || '(选择根目录)' }}</div>
      </div>

      <n-spin :show="loading">
        <div class="dir-list">
          <button v-for="d in dirs" :key="d.path" class="dir-item" @click="enter(d)">
            <n-icon :component="FolderOpenOutline" :size="16" class="dir-icon" />
            <span class="name ellipsis">{{ d.name }}</span>
            <n-icon :component="ChevronForward" :size="13" class="arrow" />
          </button>
          <div v-if="!loading && !dirs.length" class="empty">此目录下没有子目录</div>
        </div>
      </n-spin>
    </template>

    <template #footer>
      <div class="footer">
        <n-button quaternary size="small" @click="emit('update:show', false)">取消</n-button>
        <n-button size="small" type="primary" :disabled="!apiAvailable || !currentPath" @click="select">
          <template #icon><n-icon :component="Checkmark" :size="13" /></template>
          选择当前目录
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.fallback {
  padding: 16px 0;
  color: var(--text-secondary);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.path-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 10px;
  background: var(--bg-subtle);
}
.path {
  font-size: 12.5px;
  color: var(--text-primary);
  min-width: 0;
}

.dir-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dir-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}
.dir-item:hover {
  background: var(--bg-hover);
}
.dir-icon {
  color: var(--primary);
  flex-shrink: 0;
}
.name {
  font-size: 13px;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
}
.arrow {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.empty {
  padding: 24px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
