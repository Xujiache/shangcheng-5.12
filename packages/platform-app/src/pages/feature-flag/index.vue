<script setup lang="ts">
/**
 * PA-12 · 商家端功能开关（v2 · 真后端驱动 · 增减默认规则）
 *
 * - 列表来自 GET /api/v1/p/feature-flags（首次访问会自动 ensure 几条平台默认规则）
 * - 切换：POST /api/v1/p/feature-flags/:id/toggle
 * - 新增："+ 新增规则" 按钮 → 弹层填 key / label / 分组 / 受众 / 默认值 → POST /feature-flags
 * - 删除：右上角长按 / 列表项左滑 / 弹层"删除"按钮 → DELETE /feature-flags/:id
 * - 重置：POST /feature-flags/reset
 *
 * 商家端实时生效：merchant-app 的 store/feature-flag 在 onShow / onMounted 调
 * GET /api/v1/m/feature-flags，按这里配置的 audience + defaultEnabled 解析。
 */
import { ref, computed, onMounted } from 'vue'
import { featureFlagService } from '../../services'
import type { FeatureFlag, FeatureFlagGroup, FeatureFlagAudience } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const GROUP_LABEL: Record<string, string> = {
  home_entry: '首页入口',
  role_button: '角色按钮',
  side_menu: '侧边菜单',
}

const AUDIENCE_LABEL: Record<string, string> = {
  all: '全部商家',
  factory: '仅厂家',
  store: '仅门店',
  specific: '指定商户',
}

const flags = ref<FeatureFlag[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    flags.value = await featureFlagService.list()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const grouped = computed(() => {
  const m: Record<string, FeatureFlag[]> = { home_entry: [], role_button: [], side_menu: [] }
  for (const f of flags.value) {
    if (!m[f.group]) m[f.group] = []
    m[f.group].push(f)
  }
  return m
})

const enabledCount = computed(() => flags.value.filter((f) => f.defaultEnabled).length)
const totalCount = computed(() => flags.value.length)

async function toggle(f: FeatureFlag) {
  const next = !f.defaultEnabled
  // 乐观更新
  f.defaultEnabled = next
  try {
    await featureFlagService.toggle(f.id, next)
  } catch (e: any) {
    f.defaultEnabled = !next
    uni.showToast({ title: e?.message || '切换失败', icon: 'none' })
  }
}

/* ===== 新增规则弹层 ===== */
const showAdd = ref(false)
const addForm = ref<{
  key: string
  label: string
  group: FeatureFlagGroup
  audience: FeatureFlagAudience
  defaultEnabled: boolean
}>({
  key: '',
  label: '',
  group: 'home_entry',
  audience: 'all',
  defaultEnabled: true,
})

function openAdd() {
  addForm.value = { key: '', label: '', group: 'home_entry', audience: 'all', defaultEnabled: true }
  showAdd.value = true
}

async function submitAdd() {
  const f = addForm.value
  if (!f.key || !f.label) {
    uni.showToast({ title: '请填写 key 和 label', icon: 'none' })
    return
  }
  try {
    await featureFlagService.create({
      key: f.key,
      label: f.label,
      group: f.group,
      audience: f.audience,
      defaultEnabled: f.defaultEnabled,
    })
    uni.showToast({ title: '已新增', icon: 'success' })
    showAdd.value = false
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '新增失败', icon: 'none' })
  }
}

function remove(f: FeatureFlag) {
  uni.showModal({
    title: '删除规则',
    content: `删除「${f.label}」？商家端将立即恢复默认显示。`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await featureFlagService.remove(f.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

async function reset() {
  uni.showModal({
    title: '重置灰度配置',
    content: '将所有开关的灰度恢复为 100%、清空白名单、移除所有商户级别的 override；不会影响 enable/disable 本身。',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await featureFlagService.reset()
        uni.showToast({ title: '已重置', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '重置失败', icon: 'none' })
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="商家端功能开关" right-icon="refresh" @right="reset" />

    <scroll-view scroll-y class="scroll">
      <!-- 顶部提示 -->
      <view class="tip-strip">
        <Icon name="info" :size="26" color="var(--brand-primary)" />
        <text>控制商家 APP 后台的按钮 / 图标 / 菜单显隐 · 立即生效</text>
      </view>

      <!-- 总览卡 -->
      <view class="hero">
        <view class="hero-stat">
          <text class="num">{{ enabledCount }}</text>
          <text class="total">/ {{ totalCount }}</text>
        </view>
        <view class="hero-info">
          <text class="label">已开启开关</text>
          <view class="progress">
            <view class="bar" :style="{ width: (totalCount ? (enabledCount / totalCount * 100).toFixed(0) : 0) + '%' }" />
          </view>
        </view>
      </view>

      <!-- 各 group 列表 -->
      <view v-for="(list, g) in grouped" :key="g" class="card">
        <view class="card-head">
          <text class="card-title">{{ GROUP_LABEL[g] || g }}</text>
          <text class="card-count">{{ list.length }} 项</text>
        </view>
        <view v-for="f in list" :key="f.id" class="row" @longpress="remove(f)">
          <view class="row-info">
            <view class="row-title-row">
              <text class="row-title">{{ f.label }}</text>
              <view :class="['aud-chip', f.audience]">{{ AUDIENCE_LABEL[f.audience] }}</view>
            </view>
            <text class="row-key">{{ f.key }}</text>
          </view>
          <switch :checked="f.defaultEnabled" color="#FF4D2D" @click.stop="toggle(f)" />
        </view>
        <view v-if="list.length === 0" class="row-empty">暂无规则，点右下角"+"新增</view>
      </view>

      <view class="footer-tip">长按规则可删除 · 改动立即生效</view>
      <view style="height: 160rpx" />
    </scroll-view>

    <!-- 浮动新增按钮 -->
    <view class="add-fab" @click="openAdd">
      <Icon name="plus" :size="40" color="#fff" />
      <text>新增规则</text>
    </view>

    <!-- 新增弹层 -->
    <view v-if="showAdd" class="mask" @click="showAdd = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">新增功能开关</text>
          <text class="sheet-close" @click="showAdd = false">取消</text>
        </view>

        <view class="form-row">
          <text class="form-label">规则名称</text>
          <input v-model="addForm.label" class="form-input" placeholder="例：上传到选品广场" maxlength="40" />
        </view>
        <view class="form-row">
          <text class="form-label">key</text>
          <input v-model="addForm.key" class="form-input" placeholder="例：role.button.uploadToPlaza" maxlength="80" />
          <text class="form-hint">规范：group.subkey.name；最后一段为商家端读取的短键</text>
        </view>
        <view class="form-row">
          <text class="form-label">分组</text>
          <view class="form-chips">
            <view
              v-for="g in ['home_entry', 'role_button', 'side_menu']"
              :key="g"
              :class="['form-chip', addForm.group === g && 'on']"
              @click="addForm.group = g as any"
            >{{ GROUP_LABEL[g] }}</view>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">受众</text>
          <view class="form-chips">
            <view
              v-for="a in ['all', 'factory', 'store', 'specific']"
              :key="a"
              :class="['form-chip', addForm.audience === a && 'on']"
              @click="addForm.audience = a as any"
            >{{ AUDIENCE_LABEL[a] }}</view>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">默认开启</text>
          <switch :checked="addForm.defaultEnabled" color="#FF4D2D" @click.stop="addForm.defaultEnabled = !addForm.defaultEnabled" />
        </view>

        <view class="submit" @click="submitAdd">确定新增</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page, #f7f8fa);
  display: flex;
  flex-direction: column;
}
.scroll { flex: 1; height: 0; }

.tip-strip {
  margin: 16rpx 24rpx 0;
  padding: 14rpx 18rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(255, 77, 45, 0.06);
  border-radius: 12rpx;
  font-size: 22rpx;
  color: var(--text-secondary, #4e5969);
}
.hero {
  margin: 16rpx 24rpx;
  padding: 24rpx;
  background: var(--brand-gradient, linear-gradient(135deg, #ff4d2d, #ff7a45));
  color: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.hero-stat {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  .num { font-size: 56rpx; font-weight: 800; }
  .total { font-size: 24rpx; opacity: 0.8; }
}
.hero-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.hero-info .label { font-size: 22rpx; opacity: 0.85; }
.progress {
  height: 8rpx;
  background: rgba(255,255,255,0.25);
  border-radius: 999rpx;
  overflow: hidden;
  .bar { height: 100%; background: #fff; border-radius: 999rpx; }
}

.card {
  margin: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  overflow: hidden;
}
.card-head {
  padding: 20rpx 24rpx 8rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  .card-title { font-size: 28rpx; font-weight: 700; color: #1d2129; }
  .card-count { font-size: 22rpx; color: #86909c; }
}
.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-top: 1rpx solid #f0f2f5;
  &:active { background: #fafbfc; }
}
.row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.row-title-row { display: flex; align-items: center; gap: 8rpx; }
.row-title { font-size: 28rpx; color: #1d2129; font-weight: 500; }
.row-key { font-size: 20rpx; color: #909399; font-family: var(--font-family-base, monospace); }
.row-empty {
  padding: 32rpx 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: #c0c4cc;
}

.aud-chip {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 600;
  background: #f5f6f8;
  color: #4e5969;
  &.factory { background: rgba(255, 77, 45, 0.1); color: #ff4d2d; }
  &.store { background: rgba(82, 196, 26, 0.1); color: #52c41a; }
  &.specific { background: rgba(114, 46, 209, 0.1); color: #722ED1; }
}

.footer-tip {
  text-align: center;
  padding: 16rpx 0;
  font-size: 22rpx;
  color: #c0c4cc;
}

.add-fab {
  position: fixed;
  right: 32rpx;
  bottom: 56rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 26rpx;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 28rpx rgba(255, 77, 45, 0.4);
  z-index: 80;
  &:active { transform: scale(0.97); }
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 24rpx 28rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  max-height: 88vh;
  overflow-y: auto;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .sheet-title { font-size: 32rpx; font-weight: 800; color: #1d2129; }
  .sheet-close { font-size: 26rpx; color: #86909c; }
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.form-label { font-size: 24rpx; color: #4e5969; font-weight: 600; }
.form-hint { font-size: 20rpx; color: #c0c4cc; }
.form-input {
  height: 88rpx;
  padding: 0 20rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #1d2129;
}
.form-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  .form-chip {
    padding: 12rpx 24rpx;
    background: #f7f8fa;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: #4e5969;
    &.on {
      background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
      color: #fff;
      font-weight: 600;
    }
  }
}
.submit {
  margin-top: 8rpx;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 24rpx rgba(255, 77, 45, 0.35);
  &:active { transform: scale(0.98); }
}
</style>
