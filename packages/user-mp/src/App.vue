<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'
import { useCartStore } from './store/cart'

onLaunch(() => {
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
