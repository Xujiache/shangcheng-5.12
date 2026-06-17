<!-- 商家 PC · 员工管理（S3.5-T5）-->
<template>
  <div class="mp-staff">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">员工管理</h2>
        <p class="mt-1 text-sm text-g-500">
          共 {{ staffList.length }} 人 · 在职 <b class="text-success">{{ countOf('active') }}</b>
        </p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Refresh" @click="load" plain>刷新</ElButton>
        <ElButton type="primary" :icon="Plus" @click="openCreate">添加员工</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="filterRole">
        <ElTabPane
          v-for="t in tabs"
          :key="t.value"
          :label="`${t.label} (${countOfRole(t.value)})`"
          :name="t.value"
        />
      </ElTabs>
      <div class="mp-filters">
        <ElInput
          v-model="keyword"
          placeholder="搜索姓名 / 手机号"
          clearable
          :prefix-icon="Search"
          style="width: 260px"
        />
      </div>
    </ElCard>

    <ElCard shadow="never" v-loading="loading">
      <ElTable
        :data="filteredList"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
      >
        <ElTableColumn label="员工" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElAvatar :src="row.avatar" :size="36" />
              <div>
                <div class="font-medium">{{ row.name }}</div>
                <div class="text-xs text-g-500 mt-1">{{ row.phone }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="角色" width="120">
          <template #default="{ row }">
            <ElTag size="small" :type="roleTypeOf(row.role)" effect="plain">
              {{ roleLabelOf(row.role) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="门店" prop="storeName" min-width="200" />
        <ElTableColumn label="入职" prop="joinedAt" width="120" />
        <ElTableColumn label="月业绩" width="140" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.performance.toLocaleString() }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '在职' : '已离职' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton text type="primary" size="small" @click="openEdit(row)">编辑</ElButton>
            <ElDivider direction="vertical" />
            <ElButton
              text
              :type="row.status === 'active' ? 'danger' : 'success'"
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '离职' : '复职' }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDrawer v-model="drawerOpen" :size="480" :with-header="false">
      <div class="mp-drawer">
        <div class="mp-drawer__head"
          ><h3 class="m-0">{{ form.id ? '编辑员工' : '添加员工' }}</h3></div
        >
        <ElForm label-position="top">
          <ElFormItem label="姓名"><ElInput v-model="form.name" /></ElFormItem>
          <ElFormItem label="手机号"><ElInput v-model="form.phone" /></ElFormItem>
          <ElFormItem label="角色">
            <ElSelect v-model="form.role" style="width: 100%">
              <ElOption value="manager" label="店长" />
              <ElOption value="cashier" label="收银员" />
              <ElOption value="sales" label="导购" />
              <ElOption value="admin" label="管理员" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="关联门店">
            <ElSelect v-model="form.storeId" style="width: 100%" @change="onStoreChange">
              <ElOption v-for="s in stores" :key="s.id" :value="s.id" :label="s.name" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="入职日期"
            ><ElDatePicker
              v-model="form.joinedAt"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
          /></ElFormItem>
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
    fetchStaff,
    saveStaff,
    fetchStores,
    type StaffItem,
    type StaffRole,
    type StoreItem
  } from '@/api/merchant-business'
  import { ElMessage } from 'element-plus'
  import { Plus, Refresh, Search } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantStaff' })

  const tabs: { label: string; value: StaffRole | 'all' }[] = [
    { label: '全部', value: 'all' },
    { label: '店长', value: 'manager' },
    { label: '收银', value: 'cashier' },
    { label: '导购', value: 'sales' },
    { label: '管理员', value: 'admin' }
  ]

  const staffList = ref<StaffItem[]>([])
  const stores = ref<StoreItem[]>([])
  const filterRole = ref<StaffRole | 'all'>('all')
  const keyword = ref('')
  const loading = ref(false)
  const drawerOpen = ref(false)

  const form = reactive<StaffItem>({
    id: '',
    avatar: '',
    name: '',
    phone: '',
    role: 'sales',
    storeId: '',
    storeName: '',
    status: 'active',
    performance: 0,
    joinedAt: new Date().toISOString().slice(0, 10)
  })

  const filteredList = computed(() => {
    let list = staffList.value
    if (filterRole.value !== 'all') list = list.filter((s) => s.role === filterRole.value)
    if (keyword.value) {
      const kw = keyword.value.toLowerCase()
      list = list.filter((s) => s.name.includes(kw) || s.phone.includes(kw))
    }
    return list
  })

  function countOf(s: StaffItem['status']) {
    return staffList.value.filter((x) => x.status === s).length
  }
  function countOfRole(r: StaffRole | 'all') {
    if (r === 'all') return staffList.value.length
    return staffList.value.filter((s) => s.role === r).length
  }
  function roleTypeOf(r: StaffRole) {
    return ({ manager: 'success', cashier: 'primary', sales: 'warning', admin: 'danger' } as const)[
      r
    ]
  }
  function roleLabelOf(r: StaffRole) {
    return ({ manager: '店长', cashier: '收银员', sales: '导购', admin: '管理员' } as const)[r]
  }

  function onStoreChange(id: string) {
    const s = stores.value.find((x) => x.id === id)
    form.storeName = s?.name || ''
  }

  function openCreate() {
    Object.assign(form, {
      id: '',
      avatar: '',
      name: '',
      phone: '',
      role: 'sales',
      storeId: stores.value[0]?.id || '',
      storeName: stores.value[0]?.name || '',
      status: 'active',
      performance: 0,
      joinedAt: new Date().toISOString().slice(0, 10)
    })
    drawerOpen.value = true
  }

  function openEdit(s: StaffItem) {
    Object.assign(form, s)
    drawerOpen.value = true
  }

  async function onSave() {
    if (!form.name || !form.phone) {
      ElMessage.warning('请填写姓名和手机号')
      return
    }
    await saveStaff({ ...form })
    drawerOpen.value = false
    ElMessage.success('已保存')
    await load()
  }

  function toggleStatus(s: StaffItem) {
    s.status = s.status === 'active' ? 'left' : 'active'
    ElMessage.success(s.status === 'active' ? '已复职' : '已离职')
  }

  async function load() {
    loading.value = true
    try {
      staffList.value = await fetchStaff()
      stores.value = await fetchStores()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .mp-staff {
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

  .text-success {
    color: #10b981;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .mp-filters {
    display: flex;
    gap: 12px;
    margin-top: 6px;
  }

  .mp-drawer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 22px;
  }

  .mp-drawer__footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: auto;
  }
</style>
