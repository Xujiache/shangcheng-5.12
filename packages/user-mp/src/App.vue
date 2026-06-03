<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'
import { useCartStore } from './store/cart'
import { promoteService } from './services'

const PENDING_REF_KEY = 'jiujiu_pending_inviter'

/**
 * 从启动参数中识别上级邀请人 ID（?ref=xxx）。
 *   - H5: uni-app 把 location.search 解析到 options.query
 *   - 小程序: 来自 scene / query / 二维码扫码参数
 * 拿到后立即写 storage，等用户完成登录后由 store.setSession 消费一次并清除。
 */
function captureInviterRef(options: { query?: Record<string, any> } | undefined) {
  const q = options?.query || {}
  const ref = q.ref || q.inviter || q.invite
  if (ref && typeof ref === 'string') {
    try {
      uni.setStorageSync(PENDING_REF_KEY, ref)
    } catch {
      /* ignore */
    }
  }
}

onLaunch((options: any) => {
  captureInviterRef(options)
  const userStore = useUserStore()
  const cartStore = useCartStore()
  userStore.hydrate()
  cartStore.hydrate()
  // 直接读 storage，不依赖 pinia computed（同一微任务里 computed 未必已更新，
  // 打包后 mp/App 端会出现「明明 hydrate 拿到 token 却走进未登录分支」的问题）
  let loggedIn = false
  try {
    loggedIn = !!uni.getStorageSync('jiujiu_token')
  } catch {
    loggedIn = false
  }
  if (loggedIn) {
    userStore.refreshFromServer()
    userStore.connectProfileSync()
    cartStore.loadFromServer()
    // 已登录用户也可能新带 ?ref=xxx 进来 —— 立即消费并绑定（幂等）
    try {
      const pending = uni.getStorageSync(PENDING_REF_KEY)
      if (pending && typeof pending === 'string') {
        uni.removeStorageSync(PENDING_REF_KEY)
        promoteService.bindInviter(pending).catch(() => {
          /* ignore */
        })
      }
    } catch {
      /* ignore */
    }
  }
  console.log('经纬科技 用户端 启动')
})
</script>

<style lang="scss">
@import '@jiujiu/shared/tokens.css';

page {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: $font-family-base;
}

/* 全局滚动条隐藏 */
::-webkit-scrollbar {
  display: none;
}

/* H5：隐藏 uni 默认 tabBar（自定义 TabBar 接管） */
.uni-tabbar,
.uni-tabbar-bottom {
  display: none !important;
}
</style>
