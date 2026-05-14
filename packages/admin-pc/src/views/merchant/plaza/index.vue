<!-- 商家 PC · 选品广场（S3.5-T3）-->
<template>
  <div class="mp-plaza">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">选品广场</h2>
        <p class="mt-1 text-sm text-g-500">
          {{ cards.length }} 件厂家直供商品 · 已申请 {{ appliedCount }} 件
        </p>
      </div>
      <div class="flex gap-2">
        <ElInput
          v-model="keyword"
          placeholder="搜索商品 / 厂家"
          clearable
          :prefix-icon="Search"
          style="width: 280px"
        />
        <ElButton :icon="Refresh" @click="load" plain>刷新</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="tab" @tab-change="load">
        <ElTabPane label="平台推荐" name="recommended" />
        <ElTabPane label="家具" name="furniture" />
        <ElTabPane label="家居" name="home" />
        <ElTabPane label="灯具" name="lights" />
        <ElTabPane label="布艺" name="textile" />
      </ElTabs>
    </ElCard>

    <div class="mp-plaza__grid" v-loading="loading">
      <div
        v-for="card in filteredCards"
        :key="card.productId"
        class="mp-card"
        @click="openFactory(card)"
      >
        <div class="mp-card__img">
          <ElImage :src="card.productImage" fit="cover" style="width: 100%; aspect-ratio: 1" />
          <span v-if="card.isPlatformPushed" class="mp-card__pushed">平台推送</span>
          <span v-if="isApplied(card.productId)" class="mp-card__applied">已申请</span>
        </div>
        <div class="mp-card__body">
          <div class="mp-card__name">{{ card.productName }}</div>
          <div class="mp-card__factory">
            <ArtSvgIcon icon="ri:store-2-line" /> {{ card.factoryName }}
          </div>
          <div class="mp-card__tags">
            <ElTag v-for="t in card.tags" :key="t" size="small" type="info" effect="plain">{{
              t
            }}</ElTag>
          </div>
          <div class="mp-card__row">
            <div>
              <div class="mp-card__price">¥{{ card.startPrice }}</div>
              <div class="mp-card__price-label">出厂起</div>
            </div>
            <div>
              <div class="mp-card__markup"
                >+{{ card.suggestMarkupMin }}~{{ card.suggestMarkupMax }}</div
              >
              <div class="mp-card__price-label">建议加价</div>
            </div>
          </div>
          <div class="mp-card__bottom">
            <span class="text-xs text-g-500">{{ card.agencyCount }} 家在代理</span>
            <ElButton
              :type="isApplied(card.productId) ? 'info' : 'primary'"
              size="small"
              :disabled="isApplied(card.productId)"
              @click.stop="onApply(card)"
            >
              {{ isApplied(card.productId) ? '已申请' : '申请代理' }}
            </ElButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 厂家详情 Drawer -->
    <ElDrawer v-model="drawerOpen" :size="600" :with-header="false">
      <div v-if="factory" class="mp-factory">
        <div class="mp-factory__head">
          <ElAvatar :src="factory.factoryLogo" :size="64" />
          <div class="flex-1">
            <div class="text-lg font-semibold">{{ factory.factoryName }}</div>
            <div class="text-xs text-g-500 mt-1">
              <ArtSvgIcon icon="ri:star-fill" class="text-yellow-500" />
              {{ factory.rating }} · {{ factory.yearsInBusiness }} 年厂龄
            </div>
            <div class="text-xs text-g-600 mt-1">{{ factory.description }}</div>
          </div>
        </div>

        <ElCard shadow="never" class="mp-factory__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">认证资质</h4>
          <div class="flex flex-wrap gap-2">
            <ElTag v-for="c in factory.certifications" :key="c" effect="plain">
              <ArtSvgIcon icon="ri:shield-check-line" class="mr-1" />
              {{ c }}
            </ElTag>
          </div>
        </ElCard>

        <ElCard shadow="never" class="mp-factory__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">主营商品（{{ factory.cards.length }} 件）</h4>
          <div class="mp-factory__products">
            <div v-for="c in factory.cards.slice(0, 6)" :key="c.productId" class="mp-mini">
              <ElImage
                :src="c.productImage"
                fit="cover"
                style="width: 80px; height: 80px; border-radius: 8px"
              />
              <div class="flex-1 min-w-0">
                <div class="line-clamp-1 text-sm">{{ c.productName }}</div>
                <div class="text-primary text-sm font-semibold mt-1">¥{{ c.startPrice }}</div>
                <div class="text-xs text-g-500 mt-1">建议加价 +{{ c.suggestMarkupMin }}</div>
              </div>
              <ElButton
                size="small"
                :type="isApplied(c.productId) ? 'info' : 'primary'"
                :disabled="isApplied(c.productId)"
                @click="onApply(c)"
              >
                {{ isApplied(c.productId) ? '已申请' : '申请' }}
              </ElButton>
            </div>
          </div>
        </ElCard>

        <div class="mp-factory__footer">
          <ElButton @click="drawerOpen = false">关闭</ElButton>
          <ElButton type="primary" :icon="ChatLineRound" @click="contactOpen = true">
            联系厂家
          </ElButton>
        </div>
      </div>
    </ElDrawer>

    <!-- 联系厂家 Dialog -->
    <ElDialog
      v-model="contactOpen"
      :title="`联系 ${factory?.factoryName || '厂家'}`"
      width="480px"
      align-center
    >
      <div v-if="factory" class="mp-contact">
        <div class="mp-contact__row">
          <ArtSvgIcon icon="ri:user-3-line" class="text-primary" />
          <span class="text-g-500">销售对接</span>
          <b>{{ factory.contact.contactName }}</b>
        </div>
        <div class="mp-contact__row">
          <ArtSvgIcon icon="ri:phone-line" class="text-primary" />
          <span class="text-g-500">联系电话</span>
          <b class="font-mono">{{ factory.contact.contactPhone }}</b>
          <ElButton link type="primary" size="small" @click="copy(factory.contact.contactPhone)"
            >复制</ElButton
          >
        </div>
        <div class="mp-contact__row">
          <ArtSvgIcon icon="ri:wechat-line" class="text-primary" />
          <span class="text-g-500">微信号</span>
          <b class="font-mono">{{ factory.contact.wechat }}</b>
          <ElButton link type="primary" size="small" @click="copy(factory.contact.wechat)"
            >复制</ElButton
          >
        </div>
        <div class="mp-contact__row">
          <ArtSvgIcon icon="ri:mail-line" class="text-primary" />
          <span class="text-g-500">邮箱</span>
          <b class="font-mono">{{ factory.contact.email }}</b>
          <ElButton link type="primary" size="small" @click="copy(factory.contact.email)"
            >复制</ElButton
          >
        </div>
        <div class="mp-contact__row">
          <ArtSvgIcon icon="ri:map-pin-line" class="text-primary" />
          <span class="text-g-500">工厂地址</span>
          <b>{{ factory.contact.address }}</b>
        </div>
        <div class="mp-contact__row">
          <ArtSvgIcon icon="ri:time-line" class="text-primary" />
          <span class="text-g-500">工作时间</span>
          <b>{{ factory.contact.workTime }}</b>
        </div>
      </div>
      <template #footer>
        <ElButton @click="contactOpen = false">关闭</ElButton>
        <ElButton type="primary" @click="goChat">在线沟通</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchPlazaCards,
    fetchFactoryDetail,
    consumeQuota,
    createAgencyApplication,
    type FactoryDetail
  } from '@/api/merchant-business'
  import type { PlazaProductCard } from '@jiujiu/shared/types'
  import { ElMessage } from 'element-plus'
  import { Refresh, Search, ChatLineRound } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'

  defineOptions({ name: 'MerchantPlaza' })

  const cards = ref<PlazaProductCard[]>([])
  const tab = ref('recommended')
  const keyword = ref('')
  const loading = ref(false)
  const applied = ref(new Set<string>())
  const drawerOpen = ref(false)
  const contactOpen = ref(false)
  const factory = ref<FactoryDetail>()
  const router = useRouter()

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制：' + text)
    } catch {
      ElMessage.warning('复制失败，请手动选中文本')
    }
  }

  function goChat() {
    contactOpen.value = false
    drawerOpen.value = false
    router.push('/merchant/chat')
  }

  const appliedCount = computed(() => applied.value.size)

  const filteredCards = computed(() => {
    let list = cards.value
    if (tab.value === 'recommended') list = list.filter((c) => c.isPlatformPushed)
    if (keyword.value) {
      const kw = keyword.value.toLowerCase()
      list = list.filter(
        (c) => c.productName.toLowerCase().includes(kw) || c.factoryName.toLowerCase().includes(kw)
      )
    }
    return list
  })

  function isApplied(pid: string) {
    return applied.value.has(pid)
  }

  async function onApply(c: PlazaProductCard) {
    if (applied.value.has(c.productId)) return
    // 乐观更新：先把按钮置为「已申请」防止重复点击，失败时回滚
    applied.value.add(c.productId)
    try {
      await createAgencyApplication({
        factoryId: c.factoryId,
        productIds: [c.productId]
      })
      // 后端创建成功后再扣本地配额（consumeQuota 是 member-service 本地配额状态，
      // 不应在 API 失败时被扣，否则用户实际没申请但配额已被消耗）
      const res = await consumeQuota('pushSlots', 1)
      if (!res.ok) {
        ElMessage.warning(res.reason || '推送位配额不足，请升级套餐')
        return
      }
      ElMessage.success(
        res.quota
          ? `已申请代理「${c.productName}」 · 推送位 ${res.quota.used.pushSlots}/${res.quota.limits.pushSlots}`
          : `已申请代理「${c.productName}」`
      )
    } catch (e: any) {
      // 后端失败：回滚本地 Set
      applied.value.delete(c.productId)
      ElMessage.error(e?.message || '申请失败，请稍后重试')
    }
  }

  async function openFactory(c: PlazaProductCard) {
    factory.value = await fetchFactoryDetail(c.factoryId)
    drawerOpen.value = true
  }

  async function load() {
    loading.value = true
    try {
      cards.value = await fetchPlazaCards()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .mp-plaza {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .mp-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  /* 网格 */
  .mp-plaza__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .mp-card {
    overflow: hidden;
    cursor: pointer;
    background: #fff;
    border: 1px solid var(--art-border-color, #e5e7eb);
    border-radius: 12px;
    transition: all 0.18s ease;

    &:hover {
      border-color: var(--el-color-primary, #ff4d2d);
      box-shadow: 0 8px 24px -10px rgb(255 77 45 / 20%);
      transform: translateY(-2px);
    }
  }

  .mp-card__img {
    position: relative;
  }

  .mp-card__pushed,
  .mp-card__applied {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 2px 8px;
    font-size: 11px;
    color: #fff;
    background: var(--el-color-primary);
    border-radius: 4px;
  }

  .mp-card__applied {
    right: 8px;
    left: auto;
    background: #10b981;
  }

  .mp-card__body {
    padding: 12px;
  }

  .mp-card__name {
    display: -webkit-box;
    height: 40px;
    overflow: hidden;
    font-size: 14px;
    font-weight: 500;
    color: var(--art-gray-800, #1f2937);
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .mp-card__factory {
    display: flex;
    gap: 4px;
    align-items: center;
    margin: 6px 0;
    font-size: 12px;
    color: var(--art-gray-500, #6b7280);
  }

  .mp-card__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 18px;
    margin-bottom: 8px;
  }

  .mp-card__row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
  }

  .mp-card__price {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-card__markup {
    font-size: 13px;
    font-weight: 500;
    color: #10b981;
  }

  .mp-card__price-label {
    margin-top: 2px;
    font-size: 11px;
    color: var(--art-gray-500, #9ca3af);
  }

  .mp-card__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }

  /* Drawer */
  .mp-factory {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px;
  }

  .mp-factory__head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--art-border-color, #e5e7eb);
  }

  .mp-factory__card {
    background: #fafbfc;
    border-radius: 10px;

    :deep(.el-card__body) {
      padding: 14px 16px;
    }
  }

  .mp-factory__products {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .mp-mini {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .mp-factory__footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 6px;
  }

  /* 联系 Dialog */
  .mp-contact {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-contact__row {
    display: grid;
    grid-template-columns: 24px 90px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    font-size: 13px;
    background: #fafbfc;
    border-radius: 8px;

    b {
      font-weight: 600;
      color: var(--art-gray-800, #1f2937);
    }
  }

  .font-mono {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
  }
</style>
