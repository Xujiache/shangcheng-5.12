<!-- 平台 PC · 商户审核（S5-T5）-->
<template>
  <div class="pf-mc-audit">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">商户审核</h2>
        <p class="mt-1 text-sm text-g-500">入驻申请 · 资质审核</p>
      </div>
      <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
    </div>

    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab">
        <ElTabPane v-for="t in tabs" :key="t.value" :label="`${t.label} (${countOf(t.value)})`" :name="t.value" />
      </ElTabs>
    </ElCard>

    <div class="pf-cards">
      <ElCard v-for="m in filtered" :key="m.id" shadow="hover" class="pf-card">
        <div class="pf-card__head">
          <div class="flex items-center gap-2">
            <h3 class="m-0 text-base font-semibold">{{ m.name }}</h3>
            <ElTag :type="m.type === 'factory' ? 'danger' : 'warning'" size="small" effect="plain">
              {{ m.type === 'factory' ? '厂家' : '门店' }}
            </ElTag>
          </div>
          <span class="text-xs text-g-500">{{ formatDateTime(m.createdAt) }}</span>
        </div>

        <div class="pf-card__meta">
          <div><ArtSvgIcon icon="ri:user-3-line" /> {{ m.contact }} · {{ m.contactPhone }}</div>
          <div><ArtSvgIcon icon="ri:map-pin-line" /> {{ m.region }}</div>
          <div><ArtSvgIcon icon="ri:price-tag-3-line" /> {{ m.categories.slice(0, 4).join('、') }}</div>
        </div>

        <div class="pf-card__qual">
          <ElImage
            v-for="(q, i) in m.qualifications.slice(0, 3)"
            :key="i"
            :src="q"
            :preview-src-list="m.qualifications"
            fit="cover"
            class="pf-qual"
          />
          <span v-if="m.qualifications.length > 3" class="pf-qual-more">+{{ m.qualifications.length - 3 }}</span>
        </div>

        <div v-if="m.status === 'rejected' && (m as any).rejectReason" class="pf-reject">
          <ArtSvgIcon icon="ri:close-circle-line" /> 驳回原因：{{ (m as any).rejectReason }}
        </div>

        <div class="pf-card__actions">
          <ElButton plain @click="openDetail(m)">查看详情</ElButton>
          <template v-if="m.status === 'pending'">
            <ElButton type="danger" plain @click="onReject(m)">驳回</ElButton>
            <ElButton type="primary" @click="onApprove(m)">通过</ElButton>
          </template>
        </div>
      </ElCard>

      <ElEmpty v-if="filtered.length === 0" description="暂无相应商户" />
    </div>

    <!-- 详情 Drawer -->
    <ElDrawer v-model="detailOpen" :size="560" :with-header="false">
      <div v-if="current" class="pf-detail">
        <div class="pf-detail__head">
          <h3 class="m-0">{{ current.name }} · 资质详情</h3>
          <ElTag :type="current.type === 'factory' ? 'danger' : 'warning'">
            {{ current.type === 'factory' ? '厂家' : '门店' }}
          </ElTag>
        </div>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="主体公司">{{ current.legalName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="法人">{{ current.legalRep }}</ElDescriptionsItem>
          <ElDescriptionsItem label="信用代码">{{ current.creditCode }}</ElDescriptionsItem>
          <ElDescriptionsItem label="联系人">{{ current.contact }} · {{ current.contactPhone }}</ElDescriptionsItem>
          <ElDescriptionsItem label="地区">{{ current.region }}</ElDescriptionsItem>
          <ElDescriptionsItem label="地址">{{ current.address }}</ElDescriptionsItem>
          <ElDescriptionsItem label="经营品类">{{ current.categories.join('、') }}</ElDescriptionsItem>
        </ElDescriptions>
        <div class="mt-3 font-semibold text-sm">营业执照与资质</div>
        <div class="pf-qual-grid">
          <ElImage :src="current.businessLicense" :preview-src-list="[current.businessLicense, ...current.qualifications]" fit="cover" class="pf-qual-big" />
          <ElImage
            v-for="(q, i) in current.qualifications"
            :key="i"
            :src="q"
            :preview-src-list="[current.businessLicense, ...current.qualifications]"
            :initial-index="i + 1"
            fit="cover"
            class="pf-qual-big"
          />
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMerchantAudits,
    approveMerchant,
    rejectMerchant
  } from '@/api/platform-business'
  import type { Merchant } from '@jiujiu/shared/types'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformAuditMerchant' })

  type TabKey = 'pending' | 'active' | 'rejected'

  const tabs: { label: string; value: TabKey }[] = [
    { label: '待审核', value: 'pending' },
    { label: '已通过', value: 'active' },
    { label: '已驳回', value: 'rejected' }
  ]

  const tab = ref<TabKey>('pending')
  const list = ref<Merchant[]>([])
  const detailOpen = ref(false)
  const current = ref<Merchant>()

  const filtered = computed(() => list.value.filter((m) => m.status === tab.value))

  function countOf(t: TabKey) {
    return list.value.filter((m) => m.status === t).length
  }

  function openDetail(m: Merchant) {
    current.value = m
    detailOpen.value = true
  }

  async function onApprove(m: Merchant) {
    try {
      await ElMessageBox.confirm(
        `通过「${m.name}」入驻申请？将默认授予 ${m.type === 'factory' ? 'A 级厂家' : 'B 级门店'}权限。`,
        '通过审核',
        { confirmButtonText: '确认通过', cancelButtonText: '取消' }
      )
      await approveMerchant(m.id)
      ElMessage.success('已通过')
      await load()
    } catch {
      /* cancel */
    }
  }

  async function onReject(m: Merchant) {
    try {
      const { value } = await ElMessageBox.prompt('请填写驳回理由', '驳回审核', {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputValidator: (v) => (v && v.trim().length >= 2 ? true : '至少 2 个字'),
        inputPlaceholder: '资质不全 / 主体不符 / 经营范围超出 …'
      })
      await rejectMerchant(m.id, value)
      ElMessage.success('已驳回')
      await load()
    } catch {
      /* cancel */
    }
  }

  async function load() {
    list.value = await fetchMerchantAudits()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-mc-audit {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .pf-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 14px;
  }

  .pf-card {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }

  .pf-card__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pf-card__meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--art-gray-600, #4b5563);

    > div {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .pf-card__qual {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pf-qual {
    width: 70px;
    height: 70px;
    border-radius: 8px;
    border: 1px solid var(--art-border-color, #e5e7eb);
    overflow: hidden;
  }

  .pf-qual-more {
    font-size: 12px;
    color: var(--art-gray-500, #6b7280);
  }

  .pf-reject {
    background: rgba(245, 108, 108, 0.08);
    border-radius: 8px;
    padding: 8px 12px;
    color: #f56c6c;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pf-card__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
    padding-top: 12px;
  }

  .pf-detail {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-detail__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pf-qual-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .pf-qual-big {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 10px;
    border: 1px solid var(--art-border-color, #e5e7eb);
    overflow: hidden;
  }
</style>
