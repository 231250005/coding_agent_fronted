// 会话状态：列表 / 当前会话 / 置顶重命名删除（本地重排序，与后端规则一致：置顶优先 + 最近更新）
import { defineStore } from 'pinia'
import * as api from '@/api/sessions'

function sortSessions(list) {
  return [...list].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return String(b.updated_at).localeCompare(String(a.updated_at))
  })
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessions: [],
    currentId: null,
    loaded: false,
  }),

  getters: {
    current: (s) => s.sessions.find((x) => x.id === s.currentId) || null,

    /**
     * 按「置顶 / 一天内 / 一周内 / 一月内 / 更多」分组，组内按最近修改时间降序；
     * 空组不返回
     */
    groupedSessions(s) {
      const groups = [
        { key: 'pinned', label: '置顶', items: [] },
        { key: 'today', label: '今日', items: [] },
        { key: 'week', label: '一周内', items: [] },
        { key: 'month', label: '一月内', items: [] },
        { key: 'older', label: '更多', items: [] },
      ]
      const DAY = 24 * 3600 * 1000
      const now = Date.now()
      const sorted = [...s.sessions].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      for (const it of sorted) {
        const t = new Date(String(it.updated_at).replace(' ', 'T')).getTime()
        if (it.is_pinned) groups[0].items.push(it)
        else if (now - t < DAY) groups[1].items.push(it)
        else if (now - t < 7 * DAY) groups[2].items.push(it)
        else if (now - t < 30 * DAY) groups[3].items.push(it)
        else groups[4].items.push(it)
      }
      return groups.filter((g) => g.items.length > 0)
    },
  },

  actions: {
    async load() {
      this.sessions = sortSessions(await api.listSessions())
      this.loaded = true
    },

    async create(workspace, title) {
      const s = await api.createSession({ workspace, title: title || '' })
      this.sessions = sortSessions([...this.sessions, s])
      return s
    },

    setCurrent(id) {
      this.currentId = id
    },

    async pin(id, isPinned) {
      await api.pinSession(id, isPinned)
      const it = this.sessions.find((x) => x.id === id)
      if (it) {
        it.is_pinned = isPinned
        this.sessions = sortSessions(this.sessions)
      }
    },

    async rename(id, title) {
      const r = await api.renameSession(id, title)
      const it = this.sessions.find((x) => x.id === id)
      if (it) it.title = r.title
    },

    async remove(id) {
      await api.deleteSession(id)
      this.sessions = this.sessions.filter((x) => x.id !== id)
      if (this.currentId === id) this.currentId = null
    },

    /** 任务结束后刷新（标题自动填充 / 排序变化） */
    async refresh() {
      await this.load()
    },
  },
})
