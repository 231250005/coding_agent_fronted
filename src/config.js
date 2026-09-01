// 全局配置
export const APP_NAME = 'Coding Agent'

/**
 * 上下文窗口（tokens）：与后端模型窗口一致（128k），UsageBar 进度条分母
 */
export const CONTEXT_BUDGET = 128000

/**
 * 上下文压缩阈值（tokens）：后端在此阈值触发摘要压缩；
 * 前端进度条超过该值时变警示色，提示接近压缩
 */
export const CONTEXT_COMPRESS_AT = 100000

/** 主题持久化 key */
export const THEME_STORAGE_KEY = 'ca-theme'
