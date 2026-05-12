<!-- 商家 PC · 门店管理（S3.5-T4）-->
<template>
  <div class="mp-store">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">门店管理</h2>
        <p class="mt-1 text-sm text-g-500">
          共 {{ stores.length }} 家门店 · 在线 <b class="text-success">{{ countOf('online') }}</b> · 离线 {{ countOf('offline') }}
        </p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Refresh" @click="load" plain>刷新</ElButton>
        <ElButton type="primary" :icon="Plus" @click="openCreate">新建门店</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="tab">
        <ElTabPane label="我的门店" name="stores" />
        <ElTabPane label="授权管理" name="auth" />
      </ElTabs>
    </ElCard>

    <!-- 门店列表 -->
    <ElCard shadow="never" v-if="tab === 'stores'" v-loading="loading">
      <ElTable :data="stores" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="门店" min-width="320">
          <template #default="{ row }">
            <div>
              <div class="font-medium">{{ row.name }}</div>
              <div class="text-xs text-g-500 mt-1">{{ row.address }}</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="联系人" width="140">
          <template #default="{ row }">
            <div>{{ row.contact }}</div>
            <div class="text-xs text-g-500 mt-1">{{ row.phone }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="员工" prop="staffCount" width="80" align="center" />
        <ElTableColumn label="授权" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="authTypeOf(row.authStatus)" size="small">
              {{ authLabelOf(row.authStatus) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton text type="primary" size="small" @click="openEdit(row)">编辑</ElButton>
            <ElDivider direction="vertical" />
            <ElButton text type="primary" size="small" @click="onAuth(row)">
              {{ row.authStatus === 'authorized' ? '续期' : '授权' }}
            </ElButton>
            <ElDivider direction="vertical" />
            <ElButton text type="danger" size="small" @click="onRemove(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 授权管理 -->
    <ElCard shadow="never" v-else>
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <span class="font-semibold">门店授权配置</span>
            <span class="ml-2 text-xs text-g-500">门店等级 · 可见价格 · 分类权限 · 加价规则 · 有效期</span>
          </div>
          <ElButton type="primary" size="small" :icon="Plus" @click="openCreateAuth">新增授权</ElButton>
        </div>
      </template>
      <ElTable :data="authConfigs" stripe>
        <ElTableColumn label="门店" min-width="220">
          <template #default="{ row }">
            <div>
              <div class="font-medium">{{ row.storeName }}</div>
              <div class="text-xs text-g-500">{{ row.region }}</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="等级" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="levelTagTypeOf(row.level)" size="small">{{ row.level }} 级</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="可见价格" width="120" align="center">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">{{ priceTierLabelOf(row.priceVisible) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="分类权限" min-width="180">
          <template #default="{ row }">
            <span v-if="row.categories.length === 0" class="text-g-400">全部分类</span>
            <ElTag v-for="c in row.categories.slice(0, 3)" :key="c" size="small" effect="plain" class="mr-1">{{ c }}</ElTag>
            <span v-if="row.categories.length > 3" class="text-xs text-g-500">+{{ row.categories.length - 3 }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="加价率" width="100" align="center">
          <template #default="{ row }">
            <span class="text-primary font-medium">+{{ row.markupRatio }}%</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="有效期至" width="120" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpiringSoon(row.expiresAt) }">{{ row.expiresAt }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '生效中' : '已停用' }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="180" align="center" fixed="right">
          <template #default="{ row, $index }">
            <ElButton link type="primary" @click="editAuthConfig(row, $index)">配置</ElButton>
            <ElDivider direction="vertical" />
            <ElButton link :type="row.enabled ? 'warning' : 'success'" @click="toggleAuthConfig(row)">
              {{ row.enabled ? '停用' : '启用' }}
            </ElButton>
            <ElDivider direction="vertical" />
            <ElButton link type="danger" @click="removeAuthConfig($index)">撤销</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 授权配置 Drawer -->
    <ElDrawer v-model="authDrawerOpen" :size="520" :with-header="false">
      <div class="mp-drawer">
        <div class="mp-drawer__head">
          <h3 class="m-0">门店授权配置 <span v-if="authForm.storeName" class="text-sm text-g-500 font-normal">· {{ authForm.storeName }}</span></h3>
        </div>
        <ElForm :model="authForm" label-position="top">
          <ElFormItem label="门店">
            <ElSelect v-model="authForm.storeId" filterable placeholder="选择门店" style="width: 100%" :disabled="authForm.isEditing">
              <ElOption v-for="s in stores" :key="s.id" :value="s.id" :label="s.name" />
            </ElSelect>
          </ElFormItem>
          <div class="grid grid-cols-2 gap-3">
            <ElFormItem label="授权等级">
              <ElSelect v-model="authForm.level" style="width: 100%">
                <ElOption value="A" label="A 级（直营 / 核心代理）" />
                <ElOption value="B" label="B 级（普通代理）" />
                <ElOption value="C" label="C 级（试用代理）" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="可见价格层级">
              <ElSelect v-model="authForm.priceVisible" style="width: 100%">
                <ElOption value="wholesale" label="批发价" />
                <ElOption value="retail" label="零售价" />
                <ElOption value="member" label="会员价" />
              </ElSelect>
            </ElFormItem>
          </div>
          <ElFormItem label="分类权限">
            <ElSelect v-model="authForm.categories" multiple placeholder="留空 = 全部分类" style="width: 100%">
              <ElOption v-for="c in AVAILABLE_CATEGORIES" :key="c" :value="c" :label="c" />
            </ElSelect>
            <div class="text-xs text-g-500 mt-1">仅选中的分类该门店可销售；留空 = 所有分类</div>
          </ElFormItem>
          <div class="grid grid-cols-2 gap-3">
            <ElFormItem label="加价率 %">
              <ElInputNumber v-model="authForm.markupRatio" :min="0" :max="500" :step="5" style="width: 100%" />
            </ElFormItem>
            <ElFormItem label="有效期至">
              <ElDatePicker
                v-model="authForm.expiresAt"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                placeholder="选择到期日"
              />
            </ElFormItem>
          </div>
        </ElForm>
        <div class="mp-drawer__footer">
          <ElButton @click="authDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitAuthConfig">保存</ElButton>
        </div>
      </div>
    </ElDrawer>

    <!-- 编辑 Drawer -->
    <ElDrawer v-model="drawerOpen" :size="480" :with-header="false">
      <div class="mp-drawer">
        <div class="mp-drawer__head">
          <h3 class="m-0">{{ form.id ? '编辑门店' : '新建门店' }}</h3>
        </div>
        <ElForm label-position="top">
          <ElFormItem label="门店名称">
            <ElInput v-model="form.name" />
          </ElFormItem>
          <ElFormItem label="所在城市">
            <ElInput v-model="form.region" placeholder="北京市 / 上海市" />
          </ElFormItem>
          <ElFormItem label="详细地址">
            <ElInput v-model="form.address" type="textarea" :rows="2" />
          </ElFormItem>
          <div class="grid grid-cols-2 gap-3">
            <ElFormItem label="联系人">
              <ElInput v-model="form.contact" />
            </ElFormItem>
            <ElFormItem label="联系电话">
              <ElInput v-model="form.phone" />
            </ElFormItem>
          </div>
          <ElFormItem label="门店状态">
            <ElRadioGroup v-model="form.status">
              <ElRadioButton value="online">在线</ElRadioButton>
              <ElRadioButton value="offline">离线</ElRadioButton>
              <ElRadioButton value="pending">筹备中</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
        </ElForm>
        <div class="mp-drawer__footer">
          <ElButton @click="drawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="onSave">保存</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchStores,
    saveStore,
    removeStore,
    fetchStaff,
    type StoreItem,
    type StaffItem
  } from '@/api/merchant-business'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantStore' })

  const tab = ref('stores')
  const stores = ref<StoreItem[]>([])
  const authList = ref<StaffItem[]>([])
  const loading = ref(false)
  const drawerOpen = ref(false)

  /* ====== 门店授权配置 ====== */
  interface AuthConfig {
    storeId: string
    storeName: string
    region: string
    level: 'A' | 'B' | 'C'
    priceVisible: 'wholesale' | 'retail' | 'member'
    categories: string[]
    markupRatio: number
    expiresAt: string
    enabled: boolean
  }

  const AVAILABLE_CATEGORIES = ['沙发', '茶几', '电视柜', '餐桌', '餐椅', '床', '衣柜', '灯具', '床垫', '地毯']
  const AUTH_KEY = 'jj_store_auth_v1'
  const authConfigs = ref<AuthConfig[]>([])
  const authDrawerOpen = ref(false)
  const authForm = reactive<AuthConfig & { isEditing: boolean }>({
    storeId: '',
    storeName: '',
    region: '',
    level: 'B',
    priceVisible: 'retail',
    categories: [],
    markupRatio: 30,
    expiresAt: '',
    enabled: true,
    isEditing: false
  })

  function loadAuthConfigs() {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (raw) {
        authConfigs.value = JSON.parse(raw)
        return
      }
    } catch {
      /* ignore */
    }
    // 默认 demo
    const next1y = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
    const next30d = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    authConfigs.value = [
      {
        storeId: 's-1',
        storeName: '经纬科技（北京·三里屯）',
        region: '北京市',
        level: 'A',
        priceVisible: 'wholesale',
        categories: [],
        markupRatio: 20,
        expiresAt: next1y,
        enabled: true
      },
      {
        storeId: 's-2',
        storeName: '上海陆家嘴体验店',
        region: '上海市',
        level: 'B',
        priceVisible: 'retail',
        categories: ['沙发', '茶几', '电视柜'],
        markupRatio: 35,
        expiresAt: next30d,
        enabled: true
      }
    ]
  }

  function persistAuthConfigs() {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(authConfigs.value))
    } catch {
      /* ignore */
    }
  }

  function levelTagTypeOf(l: 'A' | 'B' | 'C') {
    return ({ A: 'danger', B: 'primary', C: 'info' } as const)[l]
  }

  function priceTierLabelOf(p: AuthConfig['priceVisible']) {
    return ({ wholesale: '批发价', retail: '零售价', member: '会员价' } as const)[p]
  }

  function isExpiringSoon(d: string) {
    if (!d) return false
    const diff = new Date(d).getTime() - Date.now()
    return diff > 0 && diff < 30 * 86400000
  }

  function editAuthConfig(cfg: AuthConfig, _idx: number) {
    Object.assign(authForm, cfg, { isEditing: true })
    authDrawerOpen.value = true
  }

  function toggleAuthConfig(cfg: AuthConfig) {
    cfg.enabled = !cfg.enabled
    persistAuthConfigs()
    ElMessage.success(cfg.enabled ? '已启用授权' : '已停用授权')
  }

  function removeAuthConfig(idx: number) {
    ElMessageBox.confirm('撤销该门店授权？该门店将无法继续代理你的商品', '撤销授权', {
      type: 'warning'
    }).then(() => {
      authConfigs.value.splice(idx, 1)
      persistAuthConfigs()
      ElMessage.success('已撤销')
    }).catch(() => {})
  }

  function openCreateAuth() {
    Object.assign(authForm, {
      storeId: '',
      storeName: '',
      region: '',
      level: 'B',
      priceVisible: 'retail',
      categories: [],
      markupRatio: 30,
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      enabled: true,
      isEditing: false
    })
    authDrawerOpen.value = true
  }

  function submitAuthConfig() {
    if (!authForm.storeId) {
      ElMessage.warning('请选择门店')
      return
    }
    const store = stores.value.find((s) => s.id === authForm.storeId)
    if (!store) return
    const cfg: AuthConfig = {
      storeId: authForm.storeId,
      storeName: store.name,
      region: store.region,
      level: authForm.level,
      priceVisible: authForm.priceVisible,
      categories: [...authForm.categories],
      markupRatio: authForm.markupRatio,
      expiresAt: authForm.expiresAt,
      enabled: authForm.enabled
    }
    const idx = authConfigs.value.findIndex((c) => c.storeId === authForm.storeId)
    if (idx >= 0) authConfigs.value.splice(idx, 1, cfg)
    else authConfigs.value.push(cfg)
    persistAuthConfigs()
    authDrawerOpen.value = false
    ElMessage.success('授权配置已保存')
  }

  const form = reactive<StoreItem>({
    id: '',
    name: '',
    region: '',
    address: '',
    contact: '',
    phone: '',
    status: 'pending',
    authStatus: 'unauthorized',
    staffCount: 0,
    createdAt: new Date().toISOString().slice(0, 10)
  })

  function countOf(s: StoreItem['status']) {
    return stores.value.filter((x) => x.status === s).length
  }

  function statusTypeOf(s: StoreItem['status']) {
    return ({ online: 'success', offline: 'info', pending: 'warning' } as const)[s]
  }
  function statusLabelOf(s: StoreItem['status']) {
    return ({ online: '在线', offline: '离线', pending: '筹备中' } as const)[s]
  }
  function authTypeOf(s: StoreItem['authStatus']) {
    return ({ authorized: 'success', expired: 'warning', unauthorized: 'danger' } as const)[s]
  }
  function authLabelOf(s: StoreItem['authStatus']) {
    return ({ authorized: '已授权', expired: '即将过期', unauthorized: '未授权' } as const)[s]
  }
  function roleLabelOf(r: StaffItem['role']) {
    return ({ manager: '店长', cashier: '收银员', sales: '导购', admin: '管理员' } as const)[r]
  }

  function openCreate() {
    Object.assign(form, {
      id: '',
      name: '',
      region: '',
      address: '',
      contact: '',
      phone: '',
      status: 'pending',
      authStatus: 'unauthorized',
      staffCount: 0,
      createdAt: new Date().toISOString().slice(0, 10)
    })
    drawerOpen.value = true
  }

  function openEdit(s: StoreItem) {
    Object.assign(form, s)
    drawerOpen.value = true
  }

  async function onSave() {
    if (!form.name) {
      ElMessage.warning('请填写门店名称')
      return
    }
    await saveStore({ ...form })
    drawerOpen.value = false
    ElMessage.success('已保存')
    await load()
  }

  async function onRemove(s: StoreItem) {
    try {
      await ElMessageBox.confirm(`确定删除「${s.name}」？关联员工授权一并失效。`, '危险操作', {
        type: 'warning'
      })
      await removeStore(s.id)
      ElMessage.success('已删除')
      await load()
    } catch {
      /* cancel */
    }
  }

  function onAuth(s: StoreItem) {
    s.authStatus = 'authorized'
    ElMessage.success(`已为「${s.name}」授权 365 天`)
  }

  async function load() {
    loading.value = true
    try {
      stores.value = await fetchStores()
      authList.value = await fetchStaff()
      loadAuthConfigs()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .mp-store {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .text-success {
    color: #10b981;
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .mp-drawer {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
  }

  .mp-drawer__head h3 {
    font-size: 17px;
  }

  .mp-drawer__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: auto;
  }
</style>
