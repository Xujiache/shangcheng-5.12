<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'
import { useCartStore } from './store/cart'

onLaunch(() => {
  const userStore = useUserStore()
  const cartStore = useCartStore()
  userStore.hydrate()
  cartStore.hydrate()
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
::-webkit-scrollbar { display: none; }

/* H5：隐藏 uni 默认 tabBar（自定义 TabBar 接管） */
.uni-tabbar,
.uni-tabbar-bottom {
  display: none !important;
}
</style>
