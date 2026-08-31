// 文件变更接口（L1 确认/拒绝、L2 撤销）
import http from './http'

export function listChanges(sessionId, status) {
  return http.get(`/api/sessions/${sessionId}/changes`, {
    params: status ? { status } : {},
  })
}

export function confirmChange(changeId) {
  return http.post(`/api/changes/${changeId}/confirm`)
}

export function rejectChange(changeId) {
  return http.post(`/api/changes/${changeId}/reject`)
}

export function revertChange(changeId) {
  return http.post(`/api/changes/${changeId}/revert`)
}

/** 保存全部：确认该会话全部变更，后端删除全部变更记录（变更面板随之清空） */
export function confirmAllChanges(sessionId) {
  return http.post(`/api/sessions/${sessionId}/changes/confirm-all`)
}
