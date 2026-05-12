<!--
  Admin-PC · 20 屏骨架占位组件

  本期不实现业务页面细节，仅保证路由可达 + 视觉一致。
  业务页面将在 S3 / S5 阶段按 6A 流程单独迭代。
-->
<template>
  <div class="ws-placeholder">
    <div class="ws-placeholder__hero" :class="`hero-${workspace}`">
      <div class="hero-inner">
        <div class="hero-tag">
          {{ workspace === 'merchant' ? '商家工作台' : '平台工作台' }}
        </div>
        <h2 class="hero-title">{{ title }}</h2>
        <p class="hero-desc">{{ description || '该页面属于本期骨架范围，详细业务将在后续 6A 阶段迭代实施。' }}</p>
      </div>
    </div>

    <div class="ws-placeholder__body">
      <ElCard shadow="hover" class="placeholder-card">
        <div class="card-row">
          <ElIcon class="card-icon"><Document /></ElIcon>
          <div class="card-text">
            <div class="card-text__title">业务区</div>
            <div class="card-text__desc">
              在 <code class="path">views/{{ workspace }}/{{ filename }}/index.vue</code>
              中替换本组件即可接入完整业务。
            </div>
          </div>
        </div>

        <ElDivider />

        <div class="todo-list">
          <div v-for="(item, i) in todoItems" :key="i" class="todo-item">
            <ElIcon class="todo-dot" :class="{ done: i === 0 }">
              <CircleCheckFilled v-if="i === 0" />
              <Clock v-else />
            </ElIcon>
            <span class="todo-text">{{ item }}</span>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { CircleCheckFilled, Clock, Document } from '@element-plus/icons-vue'

  defineOptions({ name: 'WorkspacePlaceholder' })

  interface Props {
    workspace: 'merchant' | 'platform'
    title: string
    description?: string
    filename: string
    todoItems?: string[]
  }

  const props = withDefaults(defineProps<Props>(), {
    description: '',
    todoItems: () => [
      '路由可达 · 已完成（admin-pc 骨架）',
      '页面业务逻辑 · 待 6A 单独迭代',
      'Mock 数据接入 · 复用 @jiujiu/shared'
    ]
  })

  // 暴露 todoItems 给模板（withDefaults 已处理默认值）
  const todoItems = computed(() => props.todoItems)
</script>

<style scoped lang="scss">
  .ws-placeholder {
    padding: 16px;
  }

  .ws-placeholder__hero {
    position: relative;
    padding: 28px 30px;
    border-radius: 14px;
    color: #fff;
    overflow: hidden;
    margin-bottom: 18px;

    &.hero-merchant {
      background: linear-gradient(135deg, #ff7a45, #ff4d2d 80%);
    }

    &.hero-platform {
      background: linear-gradient(135deg, #5d87ff, #4263eb 80%);
    }

    &::after {
      content: '';
      position: absolute;
      right: -30px;
      bottom: -30px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
    }
  }

  .hero-inner {
    position: relative;
    z-index: 1;
  }

  .hero-tag {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.18);
    font-size: 12px;
    margin-bottom: 12px;
  }

  .hero-title {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 600;
  }

  .hero-desc {
    margin: 0;
    font-size: 13px;
    opacity: 0.85;
  }

  .placeholder-card {
    border-radius: 12px;
  }

  .card-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .card-icon {
    flex-shrink: 0;
    margin-top: 4px;
    font-size: 28px;
    color: var(--el-color-primary, #ff4d2d);
  }

  .card-text__title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--art-gray-800, #1f2937);
  }

  .card-text__desc {
    font-size: 13px;
    color: var(--art-gray-600, #6b7280);
    line-height: 1.6;
  }

  .path {
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(255, 77, 45, 0.08);
    color: var(--el-color-primary, #ff4d2d);
    font-family: monospace;
    font-size: 12.5px;
  }

  .todo-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  .todo-dot {
    font-size: 16px;
    color: var(--art-gray-400, #9ca3af);

    &.done {
      color: #22c55e;
    }
  }
</style>
