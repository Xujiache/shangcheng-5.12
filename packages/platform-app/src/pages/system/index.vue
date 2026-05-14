<script setup lang="ts">
/**
 * PA-11 · 系统设置
 *
 * 4 个配置面板(基础 / 支付 / 业务规则 / 安全策略) 全部走真后端 SystemConfig:
 *   - 点击卡片任意行 → 打开对应底部 sheet,在 sheet 内完整编辑(平台名/Logo/客服/ICP 等)
 *   - sheet 内点"保存"调用 systemService.saveSettings(draft) 全量写回
 *   - 操作日志按钮跳 /pages/operation-log/index(由独立页面承接)
 *
 * 与 admin-pc 后台共用同一 SystemConfig 记录(key=system_settings),
 * payment.* 必须以 {enabled} 对象保存,passwordPolicy 必须以 {minLength,requireUppercase} 对象保存,
 * 否则 admin-pc 端会因字段形态错位无法回显 / 保存。
 */
import { ref, computed, onMounted, reactive } from 'vue'
import { systemService } from '../../services'
import type { SystemSettings } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'https://ewsn.top'
const TOKEN_KEY = 'jiujiu_admin_token'

type SheetKey = 'base' | 'payment' | 'business' | 'security'

interface SheetDraft {
  site: { name: string; logo: string; icp: string }
  service: { phone: string; email: string; workTime: string }
  payment: {
    wechat: { enabled: boolean }
    alipay: { enabled: boolean }
    balance: { enabled: boolean }
  }
  business: {
    newMerchantAutoApprove: boolean
    newProductAutoApprove: boolean
    platformCommissionRate: number
    withdrawMinAmount: number
  }
  security: {
    passwordPolicy: { minLength: number; requireUppercase: boolean }
    ipWhitelist: string[]
  }
}

const settings = ref<SystemSettings | null>(null)
const loading = ref(false)
const activeSheet = ref<SheetKey | null>(null)
const saving = ref(false)
const uploadingLogo = ref(false)
const ipWhitelistText = ref('')

// 编辑用 draft,sheet 打开时从 settings 浅拷一份(避免半保存状态污染列表展示态)
const draft = reactive<SheetDraft>({
  site: { name: '', logo: '', icp: '' },
  service: { phone: '', email: '', workTime: '' },
  payment: {
    wechat: { enabled: true },
    alipay: { enabled: false },
    balance: { enabled: true },
  },
  business: {
    newMerchantAutoApprove: false,
    newProductAutoApprove: false,
    platformCommissionRate: 5,
    withdrawMinAmount: 100,
  },
  security: {
    passwordPolicy: { minLength: 8, requireUppercase: true },
    ipWhitelist: [],
  },
})

/**
 * 后端返回的 payment.* 可能是 `{enabled: bool}` 对象或裸 boolean(历史遗留),
 * 这里统一 normalize 成对象形态,确保后续保存写回时格式与 admin-pc 一致。
 * passwordPolicy 同理:旧版可能存了字符串 'strict'|'normal',统一升成对象。
 */
function normalizeSettings(raw: any): SystemSettings {
  const pickChannel = (v: any, defaultOn: boolean) => {
    if (typeof v === 'boolean') return { enabled: v }
    if (v && typeof v.enabled === 'boolean') return { enabled: v.enabled }
    return { enabled: defaultOn }
  }
  const pickPolicy = (v: any) => {
    if (v && typeof v === 'object') {
      return {
        minLength: typeof v.minLength === 'number' ? v.minLength : 8,
        requireUppercase: v.requireUppercase !== false,
      }
    }
    return { minLength: 8, requireUppercase: true }
  }
  return {
    site: {
      name: raw?.site?.name ?? '',
      logo: raw?.site?.logo ?? '',
      icp: raw?.site?.icp ?? '',
    },
    payment: {
      wechat: pickChannel(raw?.payment?.wechat, true),
      alipay: pickChannel(raw?.payment?.alipay, false),
      balance: pickChannel(raw?.payment?.balance, true),
    },
    logistics: {
      providers: Array.isArray(raw?.logistics?.providers) ? raw.logistics.providers : [],
      defaultFreight:
        typeof raw?.logistics?.defaultFreight === 'number' ? raw.logistics.defaultFreight : 10,
    },
    service: {
      phone: raw?.service?.phone ?? '',
      email: raw?.service?.email ?? '',
      workTime: raw?.service?.workTime ?? '',
    },
    security: {
      passwordPolicy: pickPolicy(raw?.security?.passwordPolicy),
      ipWhitelist: Array.isArray(raw?.security?.ipWhitelist) ? raw.security.ipWhitelist : [],
    },
    business: {
      newMerchantAutoApprove: !!raw?.business?.newMerchantAutoApprove,
      newProductAutoApprove: !!raw?.business?.newProductAutoApprove,
      platformCommissionRate:
        typeof raw?.business?.platformCommissionRate === 'number'
          ? raw.business.platformCommissionRate
          : 5,
      withdrawMinAmount:
        typeof raw?.business?.withdrawMinAmount === 'number' ? raw.business.withdrawMinAmount : 100,
    },
  }
}

async function load() {
  loading.value = true
  try {
    const raw = await systemService.settings()
    settings.value = normalizeSettings(raw)
  } finally {
    loading.value = false
  }
}

function openSheet(key: SheetKey) {
  if (!settings.value) return
  const s = settings.value
  // 复制各 sheet 关心的字段到 draft,只在 sheet 内修改,不污染列表展示态
  if (key === 'base') {
    draft.site = { ...s.site }
    draft.service = { ...s.service }
  } else if (key === 'payment') {
    draft.payment = {
      wechat: { ...s.payment.wechat },
      alipay: { ...s.payment.alipay },
      balance: { ...s.payment.balance },
    }
  } else if (key === 'business') {
    draft.business = { ...s.business }
  } else if (key === 'security') {
    draft.security = {
      passwordPolicy: { ...s.security.passwordPolicy },
      ipWhitelist: [...s.security.ipWhitelist],
    }
    ipWhitelistText.value = s.security.ipWhitelist.join('\n')
  }
  activeSheet.value = key
}

function closeSheet() {
  if (saving.value || uploadingLogo.value) return
  activeSheet.value = null
}

/**
 * 把 draft 中当前 sheet 对应的子段合并回 settings,然后整份提交。
 * 后端 saveSystemSettings 是 upsert 全量替换 SystemConfig.value,
 * 所以必须传完整 settings,只传变更字段会丢其它已有字段。
 */
async function saveSheet() {
  if (!settings.value || !activeSheet.value || saving.value) return
  saving.value = true
  uni.showLoading({ title: '保存中…', mask: true })
  const key = activeSheet.value
  // 先在本地 merge 出待提交 payload(失败回滚 settings)
  const before = JSON.parse(JSON.stringify(settings.value)) as SystemSettings
  const next: SystemSettings = JSON.parse(JSON.stringify(settings.value))
  if (key === 'base') {
    next.site = { ...draft.site }
    next.service = { ...draft.service }
  } else if (key === 'payment') {
    next.payment = {
      wechat: { ...draft.payment.wechat },
      alipay: { ...draft.payment.alipay },
      balance: { ...draft.payment.balance },
    }
  } else if (key === 'business') {
    next.business = { ...draft.business }
  } else if (key === 'security') {
    const lines = ipWhitelistText.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    next.security = {
      passwordPolicy: { ...draft.security.passwordPolicy },
      ipWhitelist: lines,
    }
  }
  settings.value = next
  try {
    await systemService.saveSettings(next)
    uni.hideLoading()
    uni.showToast({ title: '已保存', icon: 'success' })
    activeSheet.value = null
  } catch (e: any) {
    settings.value = before
    uni.hideLoading()
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/**
 * Logo 上传走 /api/v1/files/upload(bizType=site_logo),
 * 拿到对象存储 URL 后直接写入 draft.site.logo(实时预览),
 * 真正落库需要点底部"保存"才会一并提交。
 */
function chooseLogo() {
  if (uploadingLogo.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempPath = res.tempFilePaths?.[0]
      if (!tempPath) return
      uploadingLogo.value = true
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        const token = (() => {
          try {
            return uni.getStorageSync(TOKEN_KEY) || ''
          } catch {
            return ''
          }
        })()
        const uploaded = await new Promise<{ url: string }>((resolve, reject) => {
          uni.uploadFile({
            url: BASE_URL + '/api/v1/files/upload',
            filePath: tempPath,
            name: 'file',
            header: token ? { Authorization: `Bearer ${token}` } : {},
            formData: { bizType: 'site_logo' },
            success: (r) => {
              try {
                const body = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
                if (body?.code === 0 && body?.data?.url) {
                  resolve(body.data)
                } else {
                  reject(new Error(body?.message || '上传失败'))
                }
              } catch (err) {
                reject(err as Error)
              }
            },
            fail: (err) => reject(new Error(err?.errMsg || '上传失败')),
          })
        })
        draft.site.logo = uploaded.url
        uni.hideLoading()
        uni.showToast({ title: '已上传,记得保存', icon: 'none' })
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '上传失败', icon: 'none' })
      } finally {
        uploadingLogo.value = false
      }
    },
  })
}

function clearLogo() {
  draft.site.logo = ''
}

function viewLogs() {
  uni.navigateTo({ url: '/pages/operation-log/index' })
}

// 列表展示用的派生(避免模板里到处 ?.)
const summary = computed(() => {
  const s = settings.value
  if (!s) return null
  const onCount = (p: typeof s.payment) =>
    [p.wechat.enabled, p.alipay.enabled, p.balance.enabled].filter(Boolean).length
  return {
    site: s.site,
    service: s.service,
    paymentOn: onCount(s.payment),
    business: s.business,
    security: s.security,
  }
})

const sheetTitle = computed(() => {
  switch (activeSheet.value) {
    case 'base':
      return '基础设置'
    case 'payment':
      return '支付配置'
    case 'business':
      return '业务规则'
    case 'security':
      return '安全策略'
    default:
      return ''
  }
})

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="系统设置" />

    <scroll-view scroll-y class="scroll" v-if="settings && summary">
      <!-- 站点信息卡 -->
      <view class="hero">
        <view class="site-logo">
          <image v-if="summary.site.logo" :src="summary.site.logo" class="logo-img" />
          <text v-else class="logo-letter">{{ (summary.site.name || '平')[0] }}</text>
        </view>
        <view class="site-info">
          <text class="site-name">{{ summary.site.name || '未设置平台名' }}</text>
          <text class="site-icp">{{ summary.site.icp || '尚未配置 ICP 备案号' }}</text>
          <text class="site-tag">平台版本 · v1.0.0</text>
        </view>
      </view>

      <!-- 基础设置 -->
      <view class="card" @click="openSheet('base')">
        <view class="card-title">
          <Icon name="gear" :size="28" color="var(--brand-primary)" />
          <text>基础设置</text>
          <view class="edit-tag">编辑</view>
        </view>
        <view class="row">
          <text class="r-label">平台名称</text>
          <view class="r-value">
            <text>{{ summary.site.name || '—' }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row">
          <text class="r-label">平台 Logo</text>
          <view class="r-value">
            <text>{{ summary.site.logo ? '已上传' : '未上传' }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row">
          <text class="r-label">客服电话</text>
          <view class="r-value">
            <text class="value-mono">{{ summary.service.phone || '—' }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row">
          <text class="r-label">ICP 备案号</text>
          <view class="r-value">
            <text class="value-mono">{{ summary.site.icp || '—' }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 支付配置 -->
      <view class="card" @click="openSheet('payment')">
        <view class="card-title">
          <Icon name="wallet" :size="28" color="#FAAD14" />
          <text>支付配置</text>
          <view class="edit-tag">编辑</view>
        </view>
        <view class="row">
          <text class="r-label">微信支付</text>
          <view class="r-value">
            <text
              :class="[
                'value-status',
                summary.paymentOn > 0 && settings.payment.wechat.enabled ? 'on' : 'warn',
              ]"
              >{{ settings.payment.wechat.enabled ? '已启用' : '未启用' }}</text
            >
          </view>
        </view>
        <view class="row">
          <text class="r-label">支付宝</text>
          <view class="r-value">
            <text :class="['value-status', settings.payment.alipay.enabled ? 'on' : 'warn']">{{
              settings.payment.alipay.enabled ? '已启用' : '未启用'
            }}</text>
          </view>
        </view>
        <view class="row">
          <text class="r-label">余额支付</text>
          <view class="r-value">
            <text :class="['value-status', settings.payment.balance.enabled ? 'on' : 'warn']">{{
              settings.payment.balance.enabled ? '已启用' : '未启用'
            }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 业务规则 -->
      <view class="card" @click="openSheet('business')">
        <view class="card-title">
          <Icon name="package" :size="28" color="#A855F7" />
          <text>业务规则</text>
          <view class="edit-tag">编辑</view>
        </view>
        <view class="row">
          <text class="r-label">商户自动审批</text>
          <view class="r-value">
            <text
              :class="['value-status', summary.business.newMerchantAutoApprove ? 'on' : 'warn']"
              >{{ summary.business.newMerchantAutoApprove ? '已开启' : '未开启' }}</text
            >
          </view>
        </view>
        <view class="row">
          <text class="r-label">商品自动审批</text>
          <view class="r-value">
            <text
              :class="['value-status', summary.business.newProductAutoApprove ? 'on' : 'warn']"
              >{{ summary.business.newProductAutoApprove ? '已开启' : '未开启' }}</text
            >
          </view>
        </view>
        <view class="row">
          <text class="r-label">平台抽佣比例</text>
          <view class="r-value">
            <text class="value-num accent">{{ summary.business.platformCommissionRate }}%</text>
          </view>
        </view>
        <view class="row">
          <text class="r-label">提现门槛</text>
          <view class="r-value">
            <text class="value-num">¥{{ summary.business.withdrawMinAmount }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 安全策略 -->
      <view class="card" @click="openSheet('security')">
        <view class="card-title">
          <Icon name="lock" :size="28" color="#FF3B30" />
          <text>安全策略</text>
          <view class="edit-tag">编辑</view>
        </view>
        <view class="row">
          <text class="r-label">密码最小长度</text>
          <view class="r-value">
            <text class="value-num">{{ summary.security.passwordPolicy.minLength }} 位</text>
          </view>
        </view>
        <view class="row">
          <text class="r-label">必须含大写字母</text>
          <view class="r-value">
            <text
              :class="[
                'value-status',
                summary.security.passwordPolicy.requireUppercase ? 'on' : 'warn',
              ]"
              >{{ summary.security.passwordPolicy.requireUppercase ? '是' : '否' }}</text
            >
          </view>
        </view>
        <view class="row">
          <text class="r-label">IP 白名单</text>
          <view class="r-value">
            <text
              :class="['value-status', summary.security.ipWhitelist.length > 0 ? 'on' : 'warn']"
              >{{
                summary.security.ipWhitelist.length > 0
                  ? summary.security.ipWhitelist.length + ' 条已启用'
                  : '未启用'
              }}</text
            >
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 操作日志(独立页面) -->
      <view class="card" @click="viewLogs">
        <view class="card-title">
          <Icon name="doc" :size="28" color="#52C41A" />
          <text>操作日志</text>
        </view>
        <view class="row">
          <text class="r-label">查看平台操作流水</text>
          <view class="r-value">
            <text class="hint">登录 / 配置变更 / 审核操作</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <view style="height: 60rpx" />
    </scroll-view>

    <!-- 编辑底部 sheet -->
    <view v-if="activeSheet" class="mask" @click="closeSheet">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ sheetTitle }}</text>
          <view :class="['sheet-save', saving ? 'disabled' : '']" @click="saveSheet">
            {{ saving ? '保存中…' : '保存' }}
          </view>
        </view>

        <!-- 基础设置 sheet -->
        <view v-if="activeSheet === 'base'" class="sheet-body">
          <view class="form-block">
            <text class="form-label">平台 Logo</text>
            <view class="logo-edit">
              <view class="logo-thumb" @click="chooseLogo">
                <image v-if="draft.site.logo" :src="draft.site.logo" class="logo-thumb-img" />
                <view v-else class="logo-thumb-empty">
                  <Icon name="image-plus" :size="40" color="var(--text-tertiary)" />
                  <text>点击上传</text>
                </view>
              </view>
              <view class="logo-actions">
                <view class="mini-btn ghost" @click="chooseLogo">
                  {{ uploadingLogo ? '上传中…' : '更换' }}
                </view>
                <view v-if="draft.site.logo" class="mini-btn danger-ghost" @click="clearLogo">
                  移除
                </view>
              </view>
            </view>
          </view>

          <view class="form-block">
            <text class="form-label">平台名称</text>
            <input
              v-model="draft.site.name"
              class="form-input"
              placeholder="例如：经纬科技"
              maxlength="40"
            />
          </view>

          <view class="form-block">
            <text class="form-label">客服电话</text>
            <input
              v-model="draft.service.phone"
              class="form-input"
              placeholder="例如：400-888-8888"
              type="text"
            />
          </view>

          <view class="form-block">
            <text class="form-label">客服邮箱</text>
            <input
              v-model="draft.service.email"
              class="form-input"
              placeholder="support@example.com"
              type="text"
            />
          </view>

          <view class="form-block">
            <text class="form-label">ICP 备案号</text>
            <input
              v-model="draft.site.icp"
              class="form-input"
              placeholder="例如：京 ICP 备 12345678 号"
            />
          </view>
        </view>

        <!-- 支付配置 sheet -->
        <view v-else-if="activeSheet === 'payment'" class="sheet-body">
          <view class="pay-edit-row">
            <view class="pay-icon" style="background: #3cb244">
              <Icon name="wechat" :size="32" color="#fff" />
            </view>
            <view class="pay-edit-info">
              <text class="pay-edit-name">微信支付</text>
              <text class="pay-edit-desc">官方接口 · 实时到账</text>
            </view>
            <view
              :class="['switch', draft.payment.wechat.enabled ? 'on' : '']"
              @click="draft.payment.wechat.enabled = !draft.payment.wechat.enabled"
            >
              <view class="thumb" />
            </view>
          </view>
          <view class="pay-edit-row">
            <view class="pay-icon" style="background: #1296db">
              <Icon name="apple-pay" :size="32" color="#fff" />
            </view>
            <view class="pay-edit-info">
              <text class="pay-edit-name">支付宝</text>
              <text class="pay-edit-desc">官方接口 · 实时到账</text>
            </view>
            <view
              :class="['switch', draft.payment.alipay.enabled ? 'on' : '']"
              @click="draft.payment.alipay.enabled = !draft.payment.alipay.enabled"
            >
              <view class="thumb" />
            </view>
          </view>
          <view class="pay-edit-row">
            <view class="pay-icon" style="background: #ff7a45">
              <Icon name="wallet" :size="32" color="#fff" />
            </view>
            <view class="pay-edit-info">
              <text class="pay-edit-name">余额支付</text>
              <text class="pay-edit-desc">商户余额钱包</text>
            </view>
            <view
              :class="['switch', draft.payment.balance.enabled ? 'on' : '']"
              @click="draft.payment.balance.enabled = !draft.payment.balance.enabled"
            >
              <view class="thumb" />
            </view>
          </view>
          <text class="form-hint">
            * 关闭通道后,新订单不再展示对应支付方式,已生成的交易不受影响。
          </text>
        </view>

        <!-- 业务规则 sheet -->
        <view v-else-if="activeSheet === 'business'" class="sheet-body">
          <view class="form-row-switch">
            <view class="form-row-info">
              <text class="form-row-title">新商户自动审批</text>
              <text class="form-row-desc">开启后,商户注册立即生效,跳过人工审核</text>
            </view>
            <view
              :class="['switch', draft.business.newMerchantAutoApprove ? 'on' : '']"
              @click="
                draft.business.newMerchantAutoApprove = !draft.business.newMerchantAutoApprove
              "
            >
              <view class="thumb" />
            </view>
          </view>
          <view class="form-row-switch">
            <view class="form-row-info">
              <text class="form-row-title">新商品自动审批</text>
              <text class="form-row-desc">开启后,商家上架商品立即可见,平台事后抽检</text>
            </view>
            <view
              :class="['switch', draft.business.newProductAutoApprove ? 'on' : '']"
              @click="draft.business.newProductAutoApprove = !draft.business.newProductAutoApprove"
            >
              <view class="thumb" />
            </view>
          </view>

          <view class="form-block">
            <text class="form-label">平台抽佣比例（%）</text>
            <input
              v-model.number="draft.business.platformCommissionRate"
              class="form-input"
              type="number"
              placeholder="0 - 50"
            />
            <text class="form-hint">每笔交易完成后,从商户应收金额中扣除该比例作为平台收入。</text>
          </view>

          <view class="form-block">
            <text class="form-label">提现最低额度（元）</text>
            <input
              v-model.number="draft.business.withdrawMinAmount"
              class="form-input"
              type="number"
              placeholder="例如：100"
            />
            <text class="form-hint">商户单次提现金额必须 ≥ 此门槛。</text>
          </view>
        </view>

        <!-- 安全策略 sheet -->
        <view v-else-if="activeSheet === 'security'" class="sheet-body">
          <view class="form-block">
            <text class="form-label">密码最小长度</text>
            <input
              v-model.number="draft.security.passwordPolicy.minLength"
              class="form-input"
              type="number"
              placeholder="6 - 32"
            />
            <text class="form-hint">商户/管理员登录密码长度下限,推荐 ≥ 8。</text>
          </view>

          <view class="form-row-switch">
            <view class="form-row-info">
              <text class="form-row-title">密码必须含大写字母</text>
              <text class="form-row-desc">开启后,新建/修改密码必须含至少 1 个大写字母</text>
            </view>
            <view
              :class="['switch', draft.security.passwordPolicy.requireUppercase ? 'on' : '']"
              @click="
                draft.security.passwordPolicy.requireUppercase =
                  !draft.security.passwordPolicy.requireUppercase
              "
            >
              <view class="thumb" />
            </view>
          </view>

          <view class="form-block">
            <text class="form-label">IP 白名单（一行一条 IP/CIDR）</text>
            <textarea
              v-model="ipWhitelistText"
              class="form-textarea"
              placeholder="留空 = 不启用白名单&#10;示例：&#10;192.168.1.0/24&#10;203.0.113.5"
              :auto-height="true"
            />
            <text class="form-hint">非白名单 IP 调用后台 API 将被拒绝(留空则不启用)。</text>
          </view>
        </view>
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
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}

.hero {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.25);
}
.site-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .logo-img {
    width: 100%;
    height: 100%;
    border-radius: 24rpx;
  }
  .logo-letter {
    font-size: 44rpx;
    font-weight: 800;
    color: #fff;
  }
}
.site-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .site-name {
    font-size: 32rpx;
    font-weight: 800;
  }
  .site-icp {
    font-size: 22rpx;
    opacity: 0.9;
    font-family: var(--font-family-base);
  }
  .site-tag {
    font-size: 20rpx;
    opacity: 0.85;
  }
}

.card {
  background: var(--bg-card);
  margin: 16rpx 24rpx 0;
  border-radius: 20rpx;
  padding: 8rpx 24rpx;
  box-shadow: var(--shadow-sm);
}
.card-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 0 12rpx;
  font-size: 26rpx;
  font-weight: 800;
  color: var(--text-primary);
  border-bottom: 1rpx solid var(--border-light);
}
.edit-tag {
  margin-left: auto;
  padding: 2rpx 14rpx;
  background: rgba(255, 77, 45, 0.08);
  color: var(--brand-primary);
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  gap: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .r-label {
    flex-shrink: 0;
    width: 220rpx;
    font-size: 26rpx;
    color: var(--text-tertiary);
  }
  .r-value {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    text-align: right;
    min-width: 0;
    text {
      max-width: 320rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .value-mono {
      font-family: var(--font-family-base);
      font-size: 24rpx;
    }
    .value-num {
      font-family: var(--font-family-base);
      font-weight: 700;
      &.accent {
        color: var(--brand-primary);
        font-size: 30rpx;
      }
    }
    .value-status {
      padding: 2rpx 12rpx;
      border-radius: 999rpx;
      font-size: 20rpx;
      font-weight: 700;
      &.on {
        background: rgba(82, 196, 26, 0.1);
        color: #52c41a;
      }
      &.warn {
        background: rgba(250, 173, 20, 0.1);
        color: #faad14;
      }
    }
    .hint {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
}

/* 开关 */
.switch {
  flex-shrink: 0;
  width: 80rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  position: relative;
  transition: all 0.2s;
  .thumb {
    position: absolute;
    top: 2rpx;
    left: 2rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: var(--text-tertiary);
    transition: all 0.2s;
    box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.15);
  }
  &.on {
    background: var(--brand-primary);
    border-color: var(--brand-primary);
    .thumb {
      left: 38rpx;
      background: #fff;
    }
  }
}

/* 底部 sheet */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #f7f8fa;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.sheet-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #ebeef5;
  background: #f7f8fa;
  position: sticky;
  top: 0;
  z-index: 2;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1d2129;
}
.sheet-save {
  padding: 12rpx 36rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  &.disabled {
    opacity: 0.5;
  }
}
.sheet-body {
  padding: 24rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.form-block {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.form-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #1d2129;
}
.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1d2129;
  box-sizing: border-box;
}
.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 16rpx 20rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #1d2129;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  line-height: 1.5;
}
.form-hint {
  font-size: 20rpx;
  color: #909399;
  line-height: 1.4;
}

.form-row-switch {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.03);
}
.form-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .form-row-title {
    font-size: 26rpx;
    font-weight: 700;
    color: #1d2129;
  }
  .form-row-desc {
    font-size: 20rpx;
    color: #909399;
    line-height: 1.4;
  }
}

/* Logo 编辑 */
.logo-edit {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}
.logo-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #f7f8fa;
  border: 2rpx dashed #d6d9e0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .logo-thumb-img {
    width: 100%;
    height: 100%;
  }
  .logo-thumb-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    color: #909399;
    font-size: 20rpx;
  }
}
.logo-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-top: 8rpx;
}
.mini-btn {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    background: #fff;
    border: 1rpx solid #d6d9e0;
    color: #1d2129;
  }
  &.danger-ghost {
    background: #fff;
    border: 1rpx solid rgba(245, 34, 45, 0.4);
    color: #f5222d;
  }
}

/* 支付通道编辑行 */
.pay-edit-row {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.03);
}
.pay-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pay-edit-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  .pay-edit-name {
    font-size: 26rpx;
    font-weight: 700;
    color: #1d2129;
  }
  .pay-edit-desc {
    font-size: 20rpx;
    color: #909399;
  }
}
</style>
