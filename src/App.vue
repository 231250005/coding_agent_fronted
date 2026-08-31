<script setup>
// 根组件：Naive 主题注入 + 消息 provider + 布局
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import AppShell from '@/components/layout/AppShell.vue'

const { theme, themeOverrides } = useTheme()
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider placement="top">
      <n-dialog-provider>
        <AppShell />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
