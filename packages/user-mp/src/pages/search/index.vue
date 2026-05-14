<script setup lang="ts">
/**
 * 搜索入口页
 *
 * - 顶部搜索框（自动聚焦）
 * - 搜索历史（本地存储 jiujiu_search_history，最多 10 条）
 * - 热门搜索（写死几个常见类目词，后续可改成接口）
 * - 点击建议词或回车跳到 /pages/search/result?keyword=xx&tab=product
 */
import { ref, onMounted, computed } from 'vue'
import Icon from '../../components/icon/icon.vue'
import { http } from '../../utils/request'

const STORAGE_KEY = 'jiujiu_search_history'

/**
 * 热搜词默认兜底列表
 * TODO: 后端 GET /api/v1/u/hot-keywords 接口上线后由 loadHotWords() 覆盖
 *       接口约定：返回 string[]，按搜索热度倒序，最多 10 条
 */
const HOT_WORDS_FALLBACK = ['岩板餐桌', '北欧沙发', '智能升降桌', '实木家具', '羊毛地毯', '吸顶灯', '岩板茶几']
const hotWords = ref<string[]>([...HOT_WORDS_FALLBACK])

const keyword = ref('')
const history = ref<string[]>([])

/** 拉后端热搜词；接口未上线 / 失败时保持 fallback，不阻塞页面 */
async function loadHotWords() {
  try {
    const list = await http.get<string[]>('/api/v1/u/hot-keywords', undefined, { silent: true })
    if (Array.isArray(list) && list.length > 0) {
      hotWords.value = list.slice(0, 10)
    }
  } catch {
    /* 接口 404 / 网络失败：用 fallback */
  }
}

function loadHistory() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) history.value = JSON.parse(raw)
  } catch {
    history.value = []
  }
}
function persistHistory() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(history.value))
  } catch {}
}

function pushHistory(word: string) {
  const w = word.trim()
  if (!w) return
  history.value = [w, ...history.value.filter((x) => x !== w)].slice(0, 10)
  persistHistory()
}

function clearHistory() {
  uni.showModal({
    title: '清除搜索历史',
    content: '确认清除全部搜索历史？',
    success: (r) => {
      if (r.confirm) {
        history.value = []
        persistHistory()
      }
    },
  })
}

function removeHistoryItem(w: string, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  history.value = history.value.filter((x) => x !== w)
  persistHistory()
}

function doSearch(word?: string) {
  const w = (word ?? keyword.value).trim()
  if (!w) {
    uni.showToast({ title: '请输入搜索词', icon: 'none' })
    return
  }
  pushHistory(w)
  uni.navigateTo({ url: `/pages/search/result?keyword=${encodeURIComponent(w)}&tab=product` })
}

function back() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/tabbar/home/index' }) })
}

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

onMounted(() => {
  loadHistory()
  loadHotWords()
})
</script>

<template>
  <view class="page">
    <view class="status" :style="{ height: statusBarHeight }" />
    <view class="search-bar">
      <view class="back" @click="back">
        <Icon name="chevron-left" :size="36" color="#1d2129" />
      </view>
      <view class="input-wrap">
        <Icon name="search" :size="28" color="#86909c" />
        <input
          v-model="keyword"
          class="input"
          placeholder="搜索商品 / 店铺"
          placeholder-class="ph"
          confirm-type="search"
          :focus="true"
          @confirm="doSearch()"
        />
        <view v-if="keyword" class="clear" @click="keyword = ''">
          <Icon name="close-circle" :size="28" color="#c9cdd4" :fill="true" />
        </view>
      </view>
      <view class="search-btn" @click="doSearch()">搜索</view>
    </view>

    <view v-if="history.length > 0" class="section">
      <view class="section-head">
        <text class="title">历史搜索</text>
        <view class="action" @click="clearHistory">
          <Icon name="trash" :size="26" color="#86909c" />
          <text>清空</text>
        </view>
      </view>
      <view class="chips">
        <view
          v-for="w in history"
          :key="w"
          class="chip"
          @click="doSearch(w)"
        >
          <text>{{ w }}</text>
          <view class="chip-close" @click.stop="removeHistoryItem(w, $event)">
            <Icon name="close" :size="20" color="#86909c" />
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="title">热门搜索</text>
      </view>
      <view class="chips">
        <view
          v-for="w in hotWords"
          :key="w"
          class="chip chip-hot"
          @click="doSearch(w)"
        >
          {{ w }}
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.status {
  background: #fff;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f2f3f5;
  .back {
    width: 56rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10rpx;
    height: 64rpx;
    padding: 0 20rpx;
    background: #f5f6f8;
    border-radius: 999rpx;
    .input {
      flex: 1;
      height: 100%;
      font-size: 28rpx;
      color: #1d2129;
    }
    .ph {
      color: #c9cdd4;
    }
    .clear {
      display: flex;
      align-items: center;
      padding: 4rpx;
    }
  }
  .search-btn {
    padding: 0 16rpx;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 28rpx;
    color: #ff4d2d;
    font-weight: 600;
    &:active { opacity: 0.7; }
  }
}
.section {
  padding: 32rpx 24rpx 8rpx;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  .title {
    font-size: 28rpx;
    font-weight: 800;
    color: #1d2129;
  }
  .action {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 22rpx;
    color: #86909c;
    padding: 4rpx 8rpx;
  }
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #1d2129;
  .chip-close {
    display: flex;
    align-items: center;
    padding: 2rpx;
    margin-left: 4rpx;
  }
  &:active {
    background: #ebedf0;
  }
}
.chip-hot {
  background: #fff1ed;
  color: #ff4d2d;
  font-weight: 600;
}
</style>
