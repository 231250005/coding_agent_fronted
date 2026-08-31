// 对话 REST 接口（发送任务 / 历史消息）
import http from './http'

/** 发送任务：每轮对话携带权限级别（1/2/3），触发后端 SSE 运行 */
export function sendChat(sessionId, content, permissionLevel) {
  return http.post(`/api/sessions/${sessionId}/chat`, {
    content,
    permission_level: permissionLevel,
  })
}

/** 对话历史（user 任务与 assistant 最终回答，过程事件不落库） */
export function fetchMessages(sessionId) {
  return http.get(`/api/sessions/${sessionId}/messages`)
}
