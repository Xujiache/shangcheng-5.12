<script setup lang="ts">
/**
 * MA-12 · 佣金设置
 *
 * 默认比例（一级 + 二级）+ 商品自定义 + 对分佣可见 / 线下结算开关
 */
import { ref, reactive, onMounted } from 'vue'
import { commissionService } from '../../services/customer'
import type { CommissionRuleBundle, ProductCommissionRule } from '../../services/customer'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Section from '../../components/section/section.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import Icon from '../../components/icon/icon.vue'

const ruleDefault = reactive({
  level1Percent: 8,
  level2Percent: 3,
  visibleToPromoter: true,
  allowOffline: false,
  enabled: true,
})

const productRules = ref<ProductCommissionRule[]>([])

const editing = ref<ProductCommissionRule | null>(null)

async function load() {
  try {
    const data = await commissionService.getRules()
    Object.assign(ruleDefault, data.default)
    productRules.value = data.productRules
  } catch {
    // ignore
  }
}

function adjust(key: 'level1Percent' | 'level2Percent', delta: number) {
  const next = Math.max(0, Math.min(50, ruleDefault[key] + delta))
  ruleDefault[key] = Math.round(next * 10) / 10
}

function openEdit(p: ProductCommissionRule) {
  editing.value = { ...p }
}

function saveEdit() {
  if (!editing.value) return
  const idx = productRules.value.findIndex((p) => p.productId === editing.value!.productId)
  if (idx >= 0) productRules.value[idx] = editing.value
  editing.value = null
  uni.showToast({ title: '已更新' })
}

function removeProductRule(p: ProductCommissionRule) {
  uni.showModal({
    title: '移除自定义',
    content: `「${p.productName}」将回退使用默认佣金规则`,
    success: (r) => {
      if (r.confirm) {
        productRules.value = productRules.value.filter((x) => x.productId !== p.productId)
        uni.showToast({ title: '已移除' })
      }
    },
  })
}

async function save() {
  await commissionService.saveRules({ default: ruleDefault, productRules: productRules.value })
  uni.showToast({ title: '已保存', icon: 'success' })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="佣金设置" right-text="保存" @right="save" />

    <view class="body">
      <!-- 总开关 -->
      <view class="hero">
        <view class="hero-info">
          <text class="hero-title">分销佣金</text>
          <text class="hero-desc">客户分享购买后，自动结算佣金到推广者账户</text>
        </view>
        <switch :checked="ruleDefault.enabled" color="#FF4D2D" @change="(e) => ruleDefault.enabled = e.detail.value" />
      </view>

      <Section title="默认佣金比例" sub="全店通用">
        <view class="rate-row">
          <view class="rate-info">
            <text class="rate-label">一级佣金</text>
            <text class="rate-tip">直接推广者获得</text>
          </view>
          <view class="rate-control">
            <view class="step-btn" @click="adjust('level1Percent', -0.5)">
              <Icon name="minus" :size="32" color="var(--brand-primary)" />
            </view>
            <view class="rate-value">
              <text class="value-num">{{ ruleDefault.level1Percent }}</text>
              <text class="value-unit">%</text>
            </view>
            <view class="step-btn" @click="adjust('level1Percent', 0.5)">
              <Icon name="plus" :size="32" color="var(--brand-primary)" />
            </view>
          </view>
        </view>
        <view class="rate-row">
          <view class="rate-info">
            <text class="rate-label">二级佣金</text>
            <text class="rate-tip">推广者的上级获得</text>
          </view>
          <view class="rate-control">
            <view class="step-btn" @click="adjust('level2Percent', -0.5)">
              <Icon name="minus" :size="32" color="var(--brand-primary)" />
            </view>
            <view class="rate-value">
              <text class="value-num">{{ ruleDefault.level2Percent }}</text>
              <text class="value-unit">%</text>
            </view>
            <view class="step-btn" @click="adjust('level2Percent', 0.5)">
              <Icon name="plus" :size="32" color="var(--brand-primary)" />
            </view>
          </view>
        </view>
        <view class="total-tip">
          <text>累计 </text>
          <text class="total-num">{{ ruleDefault.level1Percent + ruleDefault.level2Percent }}%</text>
          <text>，需小于商品毛利率</text>
        </view>
      </Section>

      <Section title="高级选项">
        <view class="opt-row">
          <view class="opt-info">
            <text class="opt-name">对分佣客户可见</text>
            <text class="opt-desc">在客户端展示推广佣金详情</text>
          </view>
          <switch :checked="ruleDefault.visibleToPromoter" color="#FF4D2D" @change="(e) => ruleDefault.visibleToPromoter = e.detail.value" />
        </view>
        <view class="opt-row">
          <view class="opt-info">
            <text class="opt-name">允许线下结算</text>
            <text class="opt-desc">不通过系统自动结算，由商家私下转账</text>
          </view>
          <switch :checked="ruleDefault.allowOffline" color="#FF4D2D" @change="(e) => ruleDefault.allowOffline = e.detail.value" />
        </view>
      </Section>

      <Section title="商品自定义" :sub="`${productRules.length} 件商品`" action="新增">
        <view class="prod-list">
          <view v-for="p in productRules" :key="p.productId" class="prod-row">
            <image class="prod-img" :src="p.productImage" mode="aspectFill" />
            <view class="prod-info">
              <text class="prod-name">{{ p.productName }}</text>
              <view class="prod-rate">
                <StatusTag :text="`一级 ${p.level1Percent}%`" tone="primary" />
                <StatusTag :text="`二级 ${p.level2Percent}%`" tone="info" />
              </view>
            </view>
            <view class="prod-actions">
              <view class="action" @click="openEdit(p)">编辑</view>
              <view class="action danger" @click="removeProductRule(p)">移除</view>
            </view>
          </view>
        </view>
        <view v-if="productRules.length === 0" class="empty">
          <text>暂无自定义规则，所有商品使用默认比例</text>
        </view>
      </Section>

      <view class="safe-bottom" />
    </view>

    <!-- 编辑浮层 -->
    <view v-if="editing" class="mask" @click="editing = null">
      <view class="edit-sheet" @click.stop>
        <view class="edit-head">
          <text>{{ editing.productName }}</text>
          <text class="close" @click="editing = null">✕</text>
        </view>
        <view class="edit-row">
          <text class="edit-label">一级佣金</text>
          <input v-model.number="editing.level1Percent" type="digit" class="edit-input" />
          <text class="edit-unit">%</text>
        </view>
        <view class="edit-row">
          <text class="edit-label">二级佣金</text>
          <input v-model.number="editing.level2Percent" type="digit" class="edit-input" />
          <text class="edit-unit">%</text>
        </view>
        <view class="edit-footer">
          <view class="edit-btn ghost" @click="editing = null">取消</view>
          <view class="edit-btn primary" @click="saveEdit">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 40rpx;
}
.body {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.hero {
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  .hero-info { flex: 1; }
  .hero-title { font-size: 32rpx; font-weight: 700; }
  .hero-desc { display: block; margin-top: 4rpx; font-size: 22rpx; opacity: 0.9; }
}
.rate-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-light);
  &:last-child { border-bottom: none; }
}
.rate-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .rate-label { font-size: 26rpx; font-weight: 600; color: var(--text-primary); }
  .rate-tip { font-size: 22rpx; color: var(--text-tertiary); }
}
.rate-control {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.step-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--brand-primary-ghost);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rate-value {
  display: flex;
  align-items: baseline;
  min-width: 80rpx;
  justify-content: center;
  .value-num {
    font-size: 36rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
  .value-unit {
    font-size: 22rpx;
    color: var(--text-tertiary);
    margin-left: 4rpx;
  }
}
.total-tip {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: var(--brand-primary-ghost);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
  .total-num {
    margin: 0 4rpx;
    color: var(--brand-primary);
    font-weight: 700;
    font-size: 26rpx;
  }
}
.opt-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-light);
  gap: 16rpx;
  &:last-child { border-bottom: none; }
  .opt-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .opt-name { font-size: 26rpx; font-weight: 600; color: var(--text-primary); }
    .opt-desc { font-size: 22rpx; color: var(--text-tertiary); }
  }
}
.prod-list {
  display: flex;
  flex-direction: column;
}
.prod-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  .prod-img {
    width: 96rpx;
    height: 96rpx;
    border-radius: 12rpx;
    background: var(--bg-hover);
  }
  .prod-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;
    .prod-name {
      font-size: 26rpx;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
    }
    .prod-rate { display: flex; gap: 8rpx; }
  }
  .prod-actions {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    .action {
      padding: 4rpx 16rpx;
      font-size: 22rpx;
      color: var(--brand-primary);
      &.danger { color: var(--status-error); }
    }
  }
}
.empty {
  text-align: center;
  padding: 24rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex; align-items: center; justify-content: center;
  padding: 0 48rpx;
}
.edit-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
}
.edit-head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 28rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
  .close { font-size: 28rpx; color: var(--text-tertiary); }
}
.edit-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
  .edit-label { width: 140rpx; font-size: 26rpx; color: var(--text-secondary); }
  .edit-input {
    flex: 1;
    background: var(--bg-page);
    border-radius: 8rpx;
    padding: 12rpx 16rpx;
    font-size: 26rpx;
  }
  .edit-unit { color: var(--text-tertiary); }
}
.edit-footer {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
  .edit-btn {
    flex: 1; height: 80rpx; border-radius: 999rpx;
    text-align: center; line-height: 80rpx;
    font-size: 26rpx; font-weight: 600;
    &.ghost { background: var(--bg-hover); color: var(--text-primary); }
    &.primary { background: var(--brand-gradient); color: #fff; }
  }
}
.safe-bottom { height: 40rpx; }
</style>
