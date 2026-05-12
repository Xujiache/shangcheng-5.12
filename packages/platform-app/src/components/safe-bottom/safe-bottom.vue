<script setup lang="ts">
withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>
<template><view class="sb" :style="{ height: height + 'rpx' }" /></template>
<style lang="scss" scoped>
.sb { width: 100%; }
</style>
