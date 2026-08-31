// 会话 REST 接口
import http from './http'

export function listSessions() {
  return http.get('/api/sessions')
}

export function createSession({ workspace, title = '' }) {
  return http.post('/api/sessions', { workspace, title })
}

export function pinSession(id, isPinned) {
  return http.put(`/api/sessions/${id}/pin`, { is_pinned: isPinned })
}

export function renameSession(id, title) {
  return http.put(`/api/sessions/${id}/rename`, { title })
}

export function deleteSession(id) {
  return http.delete(`/api/sessions/${id}`)
}
