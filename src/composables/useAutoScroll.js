// 消息流吸底滚动：默认跟随底部；用户上翻后暂停跟随，回到底部附近后恢复
import { nextTick, ref } from 'vue'

export function useAutoScroll(getContainer) {
  const stickToBottom = ref(true)

  function onScroll() {
    const el = getContainer()
    if (!el) return
    stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  async function scrollToBottom(force = false) {
    if (!stickToBottom.value && !force) return
    await nextTick()
    const el = getContainer()
    if (el) el.scrollTop = el.scrollHeight
  }

  return { stickToBottom, onScroll, scrollToBottom }
}
