<script setup>
defineProps({
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
  /** 大号主色圆点图案 */
  showDot: { type: Boolean, default: true },
})
</script>

<template>
  <div class="empty-state">
    <div v-if="showDot" class="dot" />
    <h3 v-if="title" class="title">{{ title }}</h3>
    <p v-if="desc" class="desc">{{ desc }}</p>
    <div class="action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}
.dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--primary) 55%, white), var(--primary));
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--primary) 12%, transparent);
  margin-bottom: 8px;
}
.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
  max-width: 320px;
}
.action {
  margin-top: 12px;
}
</style>
