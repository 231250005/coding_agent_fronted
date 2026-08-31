// 视觉设计令牌 —— 深浅两套主题的单一事实源
// useTheme 负责把这些令牌注入 Naive UI 与 CSS 变量（--xxx），自定义组件一律使用 CSS 变量

export const FONT_UI = `-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif`

export const FONT_MONO = `ui-monospace, "Cascadia Code", "JetBrains Mono", "SF Mono", Consolas, "Courier New", monospace`

export const lightTokens = {
  bgPage: '#F6F7F9',
  bgSurface: '#FFFFFF',
  bgHover: '#F0F2F5',
  bgSubtle: '#F7F8FA',
  border: '#E4E7EC',
  borderStrong: '#D0D5DD',
  textPrimary: '#1A1D21',
  textSecondary: '#5C6370',
  textTertiary: '#8A919E',
  primary: '#3B82F6',
  primaryHover: '#2E6FE4',
  primarySoft: '#EAF1FE',
  success: '#16A34A',
  successSoft: '#E7F6EC',
  warning: '#D97706',
  warningSoft: '#FCF3E1',
  danger: '#DC2626',
  dangerSoft: '#FBEAEA',
  // 工具卡片状态色
  toolIdle: '#64748B',
  toolOk: '#16A34A',
  toolFail: '#DC2626',
  // 阴影（浅色用阴影分层次，深色用边框）
  shadowCard: '0 1px 2px rgba(15, 23, 42, .05)',
  shadowCardHover: '0 2px 8px rgba(15, 23, 42, .08)',
  shadowModal: '0 12px 32px rgba(15, 23, 42, .16)',
  // 权限徽标（色相分离：L1 琥珀 / L2 蓝 / L3 紫）
  perm: {
    l1: { text: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
    l2: { text: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
    l3: { text: '#6D28D9', bg: '#EDE9FE', border: '#DDD6FE' },
  },
}

export const darkTokens = {
  bgPage: '#0F1115',
  bgSurface: '#161920',
  bgHover: '#1D222C',
  bgSubtle: '#10141B',
  border: '#262C38',
  borderStrong: '#333B4A',
  textPrimary: '#E8EAEE',
  textSecondary: '#A2A9B4',
  textTertiary: '#6E7683',
  primary: '#5B8FF9',
  primaryHover: '#6EA1FF',
  primarySoft: '#1B2A4A',
  success: '#3DC47C',
  successSoft: '#12301F',
  warning: '#EFA33C',
  warningSoft: '#33250E',
  danger: '#EF6565',
  dangerSoft: '#34191C',
  toolIdle: '#8A93A3',
  toolOk: '#3DC47C',
  toolFail: '#EF6565',
  shadowCard: 'none',
  shadowCardHover: 'none',
  shadowModal: '0 8px 24px rgba(0, 0, 0, .4)',
  perm: {
    l1: { text: '#FBBF24', bg: 'rgba(217, 119, 6, .16)', border: 'rgba(217, 119, 6, .35)' },
    l2: { text: '#7EB0FF', bg: '#1B2A4A', border: '#2A3D66' },
    l3: { text: '#B49BFF', bg: '#2A2250', border: '#3D3170' },
  },
}

/** 组装 Naive UI themeOverrides（基于当前主题令牌） */
export function buildThemeOverrides(t) {
  return {
    common: {
      primaryColor: t.primary,
      primaryColorHover: t.primaryHover,
      primaryColorPressed: t.primaryHover,
      primaryColorSuppl: t.primary,
      infoColor: t.primary,
      infoColorHover: t.primaryHover,
      infoColorPressed: t.primaryHover,
      successColor: t.success,
      warningColor: t.warning,
      errorColor: t.danger,
      errorColorHover: t.danger,
      errorColorPressed: t.danger,
      borderRadius: '8px',
      borderRadiusSmall: '6px',
      fontFamily: FONT_UI,
      fontFamilyMono: FONT_MONO,
      bodyColor: t.bgPage,
      cardColor: t.bgSurface,
      modalColor: t.bgSurface,
      popoverColor: t.bgSurface,
      tableColor: t.bgSurface,
      inputColor: t.bgSurface,
      dividerColor: t.border,
      borderColor: t.border,
      hoverColor: t.bgHover,
      textColorBase: t.textPrimary,
      textColor1: t.textPrimary,
      textColor2: t.textSecondary,
      textColor3: t.textTertiary,
    },
    Button: { borderRadiusMedium: '8px', borderRadiusSmall: '6px' },
    Tag: { borderRadius: '6px' },
    Modal: { borderRadius: '12px' },
    Dialog: { borderRadius: '12px' },
  }
}
