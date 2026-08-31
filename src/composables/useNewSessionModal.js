// 新建/重命名会话弹窗的模块级单例状态（单页应用全局唯一）
import { ref } from 'vue'

const show = ref(false)
const session = ref(null) // null = 新建模式；传入会话对象 = 重命名模式

export function useNewSessionModal() {
  function openCreate() {
    session.value = null
    show.value = true
  }
  function openRename(s) {
    session.value = s
    show.value = true
  }
  function close() {
    show.value = false
  }
  return { show, session, openCreate, openRename, close }
}
