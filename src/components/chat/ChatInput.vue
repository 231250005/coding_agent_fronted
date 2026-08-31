<script setup>
// 输入区：工作目录选择（无会话时，仅左上角文件夹图标选择）+ 权限下拉 + textarea + 发送
import { computed, nextTick, ref, watch } from 'vue'
import { NButton, NIcon, NPopover, useMessage } from 'naive-ui'
import { Send, FolderOpenOutline, ChevronUp, Close, Checkmark } from '@vicons/ionicons5'
import { useChatStore } from '@/stores/chatStore'
import { useSessionStore } from '@/stores/sessionStore'
import { PERM_META } from '@/utils/format'
import { resolveDir } from '@/api/fs'

const chatStore = useChatStore()
const sessionStore = useSessionStore()
const message = useMessage()
const textarea = ref(null)

const LEVELS = [1, 2, 3]

// 无会话时显示工作目录选择（有会话后工作区固定，隐藏）
const noSession = ref(true)
watch(
  () => chatStore.sessionId,
  (id) => {
    noSession.value = !id
  },
  { immediate: true },
)

// ---------------- 权限选择（每次发送可选：默认 / 代理 / 自动） ----------------
const currentPerm = computed(() => PERM_META[chatStore.permissionLevel] || PERM_META[2])

const permOpen = ref(false) // 上拉面板显隐（选择后自动关闭）

function setLevel(level) {
  if (chatStore.running) return
  chatStore.setPermissionLevel(level)
  permOpen.value = false // 选择后立即关闭
}

// ---------------- 工作目录：仅图标选择 / 拖拽 ----------------
/** 探测后端目录浏览接口（GET /api/fs/dirs），结果缓存 */
let probePromise = null
function probeServerBrowse() {
  if (!probePromise) {
    probePromise = listDirs('')
      .then(() => {
        serverBrowse.value = true
      })
      .catch(() => {
        serverBrowse.value = false
      })
  }
  return probePromise
}

/** 同名目录候选（后端 resolve 接口返回多个时内联展示，非弹窗） */
const candidates = ref([])

/**
 * 点击图标 → 系统原生文件夹对话框（上传图片那种 OS 弹窗）。
 * 选完后调用后端 GET /api/fs/resolve 解析出绝对路径：
 * - 唯一匹配 → 直接使用完整路径（不弹提示）
 * - 多个同名目录 → 图标旁内联列出候选，点击确定
 * - 无匹配 → 保留文件夹名
 */
async function pickFolder() {
  if (typeof window.showDirectoryPicker !== 'function') {
    message.warning('当前浏览器不支持文件夹选择')
    return
  }
  try {
    const handle = await window.showDirectoryPicker()
    const name = handle.name
    candidates.value = []

    // 1) 最近工作目录的文件夹名匹配（最快路径）
    const matched = sessionStore.sessions.find(
      (s) => s.workspace && s.workspace.replace(/[\\/]+$/, '').split(/[\\/]/).pop() === name,
    )
    if (matched) {
      chatStore.workspace = matched.workspace
      return
    }

    // 2) 后端按文件夹名解析绝对路径
    let matches = []
    try {
      matches = (await resolveDir(name)).matches || []
    } catch {
      matches = [] // 后端未实现 resolve 接口 → 保留文件夹名
    }

    if (matches.length === 1) {
      chatStore.workspace = matches[0]
    } else if (matches.length > 1) {
      chatStore.workspace = name // 先暂存名字，等用户从候选里点选
      candidates.value = matches
    } else {
      chatStore.workspace = name
    }
  } catch (e) {
    if (e.name === 'AbortError') return // 用户取消
    message.error('选择失败：' + e.message)
  }
}

function useCandidate(path) {
  chatStore.workspace = path
  candidates.value = []
}

// ---------------- 发送 ----------------
function autosize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

async function submit() {
  if (chatStore.running) return
  const err = await chatStore.send()
  if (err) {
    message.error(err.error)
    return
  }
  await nextTick()
  autosize()
  textarea.value?.focus()
}

function onKeydown(e) {
  // 中文输入法组合期间不触发发送
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}
</script>

<template>
  <div class="input-wrap">
    <div class="input-card" :class="{ locked: chatStore.running }">
      <!-- 工作目录选择（仅无会话时）：左上角文件夹图标，不可手输 -->
      <div v-if="noSession" class="ws-line">
        <button class="folder-btn" title="选择工作目录" @click="pickFolder">
          <n-icon :component="FolderOpenOutline" :size="15" />
        </button>
        <template v-if="chatStore.workspace">
          <span class="ws-chip mono ellipsis" :title="chatStore.workspace">{{ chatStore.workspace }}</span>
          <button class="ws-clear" title="清除" @click="chatStore.workspace = ''">
            <n-icon :component="Close" :size="12" />
          </button>
        </template>
        <span v-else class="ws-placeholder">选择工作目录</span>
      </div>

      <!-- 同名目录候选（后端解析出多个时内联展示） -->
      <div v-if="candidates.length" class="ws-cands">
        <span class="cand-label">找到 {{ candidates.length }} 个同名目录，请选择：</span>
        <button v-for="p in candidates" :key="p" class="cand-chip mono ellipsis" :title="p" @click="useCandidate(p)">
          {{ p }}
        </button>
      </div>

      <textarea
        ref="textarea"
        v-model="chatStore.input"
        rows="1"
        class="input-text"
        :placeholder="chatStore.running ? '任务运行中，请稍候…' : '描述你的编程任务，Enter 发送，Shift+Enter 换行'"
        :disabled="chatStore.running"
        @input="autosize"
        @keydown="onKeydown"
      />

      <div class="input-foot">
        <n-popover v-model:show="permOpen" trigger="click" placement="top-start" :show-arrow="false" :disabled="chatStore.running" class="perm-pop">
          <template #trigger>
            <button class="perm-drop" :class="currentPerm.cls" :disabled="chatStore.running">
              <n-icon :component="currentPerm.icon" :size="14" class="perm-icon" />
              <span class="perm-text">{{ currentPerm.label }}</span>
              <n-icon :component="ChevronUp" :size="12" class="arrow" />
            </button>
          </template>

          <!-- 自定义权限面板：每项 = 图标 + 上名称下解释，间距/对齐完全可控 -->
          <div class="ca-perm-menu">
            <button
              v-for="l in LEVELS"
              :key="l"
              class="ca-perm-item"
              :class="{ active: chatStore.permissionLevel === l }"
              @click="setLevel(l)"
            >
              <n-icon :component="PERM_META[l].icon" :size="16" class="ca-perm-item-icon" :class="PERM_META[l].cls" />
              <span class="ca-perm-item-text">
                <span class="ca-perm-item-title">{{ PERM_META[l].label }}</span>
                <span class="ca-perm-item-desc">{{ PERM_META[l].desc }}</span>
              </span>
              <n-icon v-if="chatStore.permissionLevel === l" :component="Checkmark" :size="14" class="ca-perm-item-check" />
            </button>
          </div>
        </n-popover>

        <div class="spacer" />

        <n-button
          type="primary"
          size="small"
          :loading="chatStore.sending"
          :disabled="chatStore.sending || chatStore.running || !chatStore.input.trim() || (noSession && !chatStore.workspace.trim())"
          @click="submit"
        >
          <template #icon><n-icon :component="Send" :size="14" /></template>
          发送
        </n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-wrap {
  flex-shrink: 0;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 12px 32px 72px; /* 底部留白给足，输入框离屏幕底较远 */
}

/* 权限面板（NPopover 渲染在 body 下，需全局样式）：
   每项 = 左侧图标 + 右侧（上：名称 / 下：解释）+ 选中勾；间距/对齐完全自定义 */
:global(.ca-perm-menu) {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
}
:global(.ca-perm-item) {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}
:global(.ca-perm-item:hover) {
  background: var(--bg-hover);
}
:global(.ca-perm-item.active) {
  background: var(--primary-soft);
}
:global(.ca-perm-item-icon) {
  flex-shrink: 0;
  color: var(--text-secondary);
}
:global(.ca-perm-item-icon.perm-l1) {
  color: var(--perm-l1-text);
}
:global(.ca-perm-item-icon.perm-l2) {
  color: var(--perm-l2-text);
}
:global(.ca-perm-item-icon.perm-l3) {
  color: var(--perm-l3-text);
}
:global(.ca-perm-item-text) {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}
:global(.ca-perm-item-title) {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}
:global(.ca-perm-item-desc) {
  font-size: 11.5px;
  line-height: 1.3;
  color: var(--text-tertiary);
  white-space: nowrap; /* 解释保持单行 */
}
:global(.ca-perm-item-check) {
  color: var(--primary);
  flex-shrink: 0;
}

.input-card {
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--bg-surface);
  padding: 10px 12px 8px;
  box-shadow: var(--shadow-card);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input-card:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}
.input-card.locked {
  opacity: 0.65;
}

/* 工作目录选择行（左上角） */
.ws-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  margin-bottom: 6px;
}
.folder-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 7px;
  background: var(--primary-soft);
  color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.folder-btn:hover {
  background: var(--primary);
  color: #fff;
}
.ws-chip {
  font-size: 12px;
  color: var(--text-primary);
  min-width: 0;
  flex: 1;
}
.ws-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
}
.ws-clear:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.ws-placeholder {
  font-size: 12px;
  color: var(--text-tertiary);
  user-select: none;
}

/* 同名目录候选行 */
.ws-cands {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.cand-label {
  font-size: 11.5px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.cand-chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 11.5px;
  padding: 2px 10px;
  cursor: pointer;
  max-width: 260px;
  transition: all 0.15s ease;
}
.cand-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

/* 输入框 */
.input-text {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  min-height: 24px;
  max-height: 160px;
  overflow-y: auto;
  display: block;
}
.input-text::placeholder {
  color: var(--text-tertiary);
}

.input-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

/* 权限下拉触发器 */
.perm-drop {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 12px;
  color: var(--text-secondary);
}
.perm-drop:hover {
  border-color: var(--border-strong);
  background: var(--bg-hover);
}
.perm-drop:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.perm-icon {
  flex-shrink: 0;
}
.perm-text {
  font-weight: 600;
  white-space: nowrap;
}
.arrow {
  color: var(--text-tertiary);
}

/* 各级权限触发器配色 */
.perm-drop.perm-l1 .perm-icon {
  color: var(--perm-l1-text);
}
.perm-drop.perm-l1 .perm-text {
  color: var(--perm-l1-text);
}
.perm-drop.perm-l2 .perm-icon {
  color: var(--perm-l2-text);
}
.perm-drop.perm-l2 .perm-text {
  color: var(--perm-l2-text);
}
.perm-drop.perm-l3 .perm-icon {
  color: var(--perm-l3-text);
}
.perm-drop.perm-l3 .perm-text {
  color: var(--perm-l3-text);
}

.spacer {
  flex: 1;
}
</style>
