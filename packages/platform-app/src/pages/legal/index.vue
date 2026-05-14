<script setup lang="ts">
/**
 * PA · 法律协议管理
 *
 * 对接后端 LegalAdminController：
 *   GET  /api/v1/p/legal/agreements  → { user, privacy, collect }
 *   PUT  /api/v1/p/legal/agreements  ← 同结构
 *
 * 三段协议（用户协议 / 隐私政策 / 个人信息收集清单）合并保存。
 * 端上（user-mp / merchant-app / platform-app 登录页）通过公开接口
 * GET /api/v1/u/agreements 读取，因此这里改完即刻全端生效。
 */
import { ref, computed, onMounted } from 'vue'
import { legalService } from '../../services'
import type { LegalAgreements } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

type SectionKey = 'user' | 'privacy' | 'collect'

const TABS: { key: SectionKey; label: string; desc: string; tint: string }[] = [
  { key: 'user', label: '用户协议', desc: '注册 / 登录 / 行为规范', tint: '#FF4D2D' },
  { key: 'privacy', label: '隐私政策', desc: '个人信息处理规则', tint: '#1296DB' },
  { key: 'collect', label: '收集清单', desc: '个人信息明细', tint: '#52C41A' },
]

const data = ref<LegalAgreements | null>(null)
const tab = ref<SectionKey>('user')
const loading = ref(false)
const saving = ref(false)

const current = computed(() => (data.value ? data.value[tab.value] : null))

async function load() {
  loading.value = true
  try {
    data.value = await legalService.get()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onTitleEdit() {
  if (!current.value) return
  uni.showModal({
    title: '编辑标题',
    editable: true,
    content: current.value.title,
    success: (r) => {
      if (r.confirm && r.content && data.value) {
        data.value[tab.value].title = r.content
      }
    },
  })
}

function onUpdatedAtEdit() {
  if (!current.value) return
  uni.showModal({
    title: '生效日期（YYYY-MM-DD）',
    editable: true,
    content: current.value.updatedAt,
    success: (r) => {
      if (r.confirm && r.content && data.value) {
        data.value[tab.value].updatedAt = r.content
      }
    },
  })
}

async function save() {
  if (!data.value) return
  if (!data.value.user?.body || !data.value.privacy?.body || !data.value.collect?.body) {
    uni.showToast({ title: '三段正文均不能为空', icon: 'none' })
    return
  }
  saving.value = true
  uni.showLoading({ title: '保存中…' })
  try {
    await legalService.save(data.value)
    uni.hideLoading()
    uni.showToast({ title: '已保存 · 端上即时生效', icon: 'success' })
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="法律协议管理" />

    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="tab = t.key"
      >
        <text class="tab-label">{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" :style="{ background: t.tint }" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" v-if="current">
      <!-- 元信息卡 -->
      <view class="meta-card">
        <view class="meta-row" @click="onTitleEdit">
          <view class="m-key">
            <Icon name="tag" :size="26" color="var(--brand-primary)" />
            <text>标题</text>
          </view>
          <view class="m-val">
            <text class="m-val-text">{{ current.title }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="meta-row" @click="onUpdatedAtEdit">
          <view class="m-key">
            <Icon name="clock" :size="26" color="var(--brand-primary)" />
            <text>生效日期</text>
          </view>
          <view class="m-val">
            <text class="m-val-text mono">{{ current.updatedAt }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 正文编辑卡 -->
      <view class="body-card">
        <view class="body-head">
          <text class="body-title">正文（Markdown）</text>
          <text class="body-len">{{ current.body.length }} 字</text>
        </view>
        <textarea
          v-model="current.body"
          class="body-input"
          placeholder="支持 Markdown：# 标题、**加粗**、- 列表、表格等"
          auto-height
          :show-confirm-bar="false"
          :cursor-spacing="20"
          maxlength="-1"
        />
      </view>

      <view class="tip">
        <Icon name="info" :size="22" color="var(--text-tertiary)" />
        <text>三段协议合并保存，公开接口 /u/agreements 即刻返回最新内容</text>
      </view>

      <view style="height: 200rpx" />
    </scroll-view>

    <view v-else-if="!loading" class="empty">
      <text>暂无协议数据</text>
    </view>

    <!-- 底部保存栏 -->
    <view class="ft" v-if="data">
      <view :class="['ft-btn', saving ? 'loading' : '']" @click="save">
        {{ saving ? '保存中…' : '保存全部修改' }}
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 56rpx;
    height: 6rpx;
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx 0;
  box-sizing: border-box;
}
.meta-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 0 24rpx;
  box-shadow: var(--shadow-sm);
}
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  gap: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
}
.m-key {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.m-val {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
  min-width: 0;
  .m-val-text {
    max-width: 360rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 26rpx;
    color: var(--text-primary);
    font-weight: 600;
    &.mono { font-family: var(--font-family-base); font-weight: 500; }
  }
}
.body-card {
  margin-top: 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.body-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  .body-title { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
  .body-len { font-size: 20rpx; color: var(--text-tertiary); font-family: var(--font-family-base); }
}
.body-input {
  width: 100%;
  min-height: 600rpx;
  padding: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  line-height: 1.55;
  color: var(--text-primary);
  box-sizing: border-box;
  font-family: var(--font-family-base);
}
.tip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: var(--text-tertiary);
}
.ft {
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-light);
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.ft-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  background: var(--brand-gradient);
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
  &.loading { opacity: 0.7; }
}
</style>
