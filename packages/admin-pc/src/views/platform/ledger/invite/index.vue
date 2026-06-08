<!--
  平台 PC · 门窗利账 · 邀请统计（#10）
  ─────────────────────────────────────────────
  对接后端 /api/v1/p/ledger/invite-stats。
  运营在此查看自助注册总量、邀请注册量，以及邀请人排行（按成功邀请人数）。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">邀请统计</h2>
        <p class="mt-1 text-sm text-g-500">自助注册与邀请奖励数据 · 邀请人排行</p>
      </div>
      <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
    </div>

    <div class="pf-stat-grid">
      <ElCard shadow="never" class="pf-stat">
        <div class="pf-stat-v">{{ stats.totalUsers }}</div>
        <div class="pf-stat-l">注册账号总数</div>
      </ElCard>
      <ElCard shadow="never" class="pf-stat">
        <div class="pf-stat-v">{{ stats.invitedUsers }}</div>
        <div class="pf-stat-l">其中邀请注册</div>
      </ElCard>
      <ElCard shadow="never" class="pf-stat">
        <div class="pf-stat-v">{{ inviteRate }}%</div>
        <div class="pf-stat-l">邀请注册占比</div>
      </ElCard>
    </div>

    <ElCard shadow="never">
      <div class="pf-sub">邀请人排行（按成功邀请人数）</div>
      <ElTable
        v-loading="loading"
        :data="stats.list"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无邀请数据"
      >
        <ElTableColumn label="排名" width="80" align="center">
          <template #default="{ $index }">
            <span class="pf-rank">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="邀请人" min-width="160">
          <template #default="{ row }">
            <div class="pf-mono">{{ row.phone }}</div>
            <div class="text-xs text-g-500">{{ row.nickname || '—' }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="邀请码" width="140">
          <template #default="{ row }">
            <span class="pf-mono">{{ row.inviteCode || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="成功邀请" width="120" align="center">
          <template #default="{ row }">
            <ElTag type="success" size="small" effect="light">{{ row.invitedCount }} 人</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'
  import { fetchLedgerInviteStats, type LedgerInviteStats } from '@/api/ledger'

  defineOptions({ name: 'PlatformLedgerInvite' })

  const loading = ref(false)
  const stats = ref<LedgerInviteStats>({ totalUsers: 0, invitedUsers: 0, list: [] })

  const inviteRate = computed(() => {
    if (!stats.value.totalUsers) return 0
    return Math.round((stats.value.invitedUsers / stats.value.totalUsers) * 100)
  })

  async function load() {
    loading.value = true
    try {
      stats.value = await fetchLedgerInviteStats()
    } catch (e: any) {
      ElMessage.error(e?.message || '加载邀请统计失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-ledger {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-mono {
    font-family: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  .pf-stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .pf-stat {
    text-align: center;
    border-radius: 12px;
  }

  .pf-stat-v {
    font-size: 28px;
    font-weight: 700;
    color: #0e7c66;
  }

  .pf-stat-l {
    margin-top: 6px;
    font-size: 13px;
    color: #6b7280;
  }

  .pf-sub {
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .pf-rank {
    font-weight: 700;
    color: #6b7280;
  }
</style>
