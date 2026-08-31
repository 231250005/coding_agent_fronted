// 文件变更状态：列表 / 过滤 / 确认拒绝撤销（L1 与 L2/L3 共用，双向同步 SSE）
import { defineStore } from 'pinia'
import * as api from '@/api/changes'
import { normalizeStatus } from '@/utils/format'

export const useChangeStore = defineStore('change', {
  state: () => ({
    items: [],
    filter: 'all', // all | pending | applied | rejected | reverted
    detailId: null,
    loading: false,
  }),

  getters: {
    filtered(s) {
      if (s.filter === 'all') return s.items
      return s.items.filter((c) => normalizeStatus(c.status) === s.filter)
    },
    counts(s) {
      const c = { all: s.items.length, pending: 0, applied: 0, rejected: 0, reverted: 0 }
      for (const it of s.items) c[normalizeStatus(it.status)]++
      return c
    },
    pendingCount(s) {
      return s.items.filter((c) => normalizeStatus(c.status) === 'pending').length
    },
  },

  actions: {
    async load(sessionId) {
      this.loading = true
      try {
        this.items = (await api.listChanges(sessionId)) || []
      } finally {
        this.loading = false
      }
    },

    clear() {
      this.items = []
      this.detailId = null
    },

    async confirm(id) {
      const r = await api.confirmChange(id)
      this.applyStatus(id, r.status)
      return r
    },

    async reject(id) {
      const r = await api.rejectChange(id)
      this.applyStatus(id, r.status)
      return r
    },

    async revert(id) {
      const r = await api.revertChange(id)
      // 撤销成功后本地移除该项（配合后端删除记录；后端未删时前端也不再展示）
      this.removeItem(id)
      return r
    },

    /** 从列表移除变更（撤销后不再展示） */
    removeItem(id) {
      this.items = this.items.filter((c) => c.id !== id)
      if (this.detailId === id) this.detailId = null
    },

    /** 保存全部：确认该会话全部变更（后端删除记录），本地清空 */
    async confirmAll(sessionId) {
      const r = await api.confirmAllChanges(sessionId)
      this.items = []
      this.detailId = null
      return r
    },

    /** 统一更新状态（SSE 的 confirmed 与 REST 的 applied 归一化） */
    applyStatus(id, status) {
      const it = this.items.find((x) => x.id === id)
      if (it) it.status = normalizeStatus(status)
    },
  },
})
