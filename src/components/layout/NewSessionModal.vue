<script setup>
// 新建 / 重命名会话弹窗：新建填 workspace 绝对路径 + 可选标题；重命名只改标题
import { computed, ref, watch } from 'vue'
import { NButton, NForm, NFormItem, NInput, NModal } from 'naive-ui'

const props = defineProps({
  show: { type: Boolean, default: false },
  /** 传入会话对象 = 重命名模式；null = 新建 */
  session: { type: Object, default: null },
})

const emit = defineEmits(['update:show', 'created', 'renamed'])

const isRename = computed(() => !!props.session)

const workspace = ref('')
const title = ref('')

// 每次打开重置表单
watch(
  () => props.show,
  (v) => {
    if (v) {
      workspace.value = isRename.value ? props.session.workspace : ''
      title.value = isRename.value ? props.session.title : ''
    }
  },
)

async function submit() {
  if (isRename.value) {
    emit('renamed', { id: props.session.id, title: title.value.trim() })
  } else {
    if (!workspace.value.trim()) return
    emit('created', { workspace: workspace.value.trim(), title: title.value.trim() })
  }
}
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="false"
    preset="card"
    :title="isRename ? '重命名会话' : '新建会话'"
    style="width: 460px"
    :bordered="false"
    @update:show="(v) => emit('update:show', v)"
  >
    <n-form label-placement="top" :model="{ workspace, title }">
      <n-form-item v-if="!isRename" label="工作目录" path="workspace">
        <n-input
          v-model:value="workspace"
          placeholder="agent 的工作目录（绝对路径），如 D:/coding_agent/coding_agent"
          clearable
        />
      </n-form-item>
      <n-form-item :label="isRename ? '会话标题' : '标题（可选）'" path="title">
        <n-input
          v-model:value="title"
          :placeholder="isRename ? '新的会话标题' : '留空则自动用首个任务命名'"
          maxlength="60"
          clearable
          @keyup.enter="submit"
        />
      </n-form-item>
      <div class="actions">
        <n-button quaternary @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="submit">
          {{ isRename ? '保存' : '创建' }}
        </n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
