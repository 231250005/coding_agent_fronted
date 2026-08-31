// 会话切换编排：watch currentId → 重置聊天 + 恢复缓存/载历史 + 载变更 + 连 SSE
// 运行中的任务过程事件不落库、SSE 不重放——切回时优先用内存快照恢复现场，再连 SSE 续接
import { watch } from 'vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useChatStore } from '@/stores/chatStore'
import { useChangeStore } from '@/stores/changeStore'

export function useActiveSession() {
  const sessionStore = useSessionStore()
  const chatStore = useChatStore()
  const changeStore = useChangeStore()

  watch(
    () => sessionStore.currentId,
    async (id) => {
      if (!id) {
        // 切到"新会话"界面：清空聊天区（旧会话快照已在 reset 中缓存）
        chatStore.reset(null)
        changeStore.clear()
        return
      }
      chatStore.reset(id)
      changeStore.clear()
      changeStore.load(id).catch(() => {})

      // 优先恢复内存快照（运行中的消息流不落库，靠快照保住现场）
      const cached = chatStore.restoreCache(id)
      if (cached) {
        chatStore.applyCache(cached)
      } else {
        try {
          await chatStore.loadHistory(id)
        } catch {
          /* 后端不可用时历史加载失败，SSE 仍尝试连接 */
        }
      }

      chatStore.connectStream(id)

      // 快照显示任务运行中 → 校验是否真的还在跑（切走期间可能已结束）
      if (cached && cached.running) {
        chatStore.verifyRunningTask()
      }
    },
  )
}
