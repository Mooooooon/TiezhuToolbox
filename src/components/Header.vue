<template>
    <el-menu :default-active="activeIndex" class="toolbox-header-menu" mode="horizontal" :ellipsis="false"
        @select="handleSelect">
        <img style="width: 25px; padding: 0 20px;" src="../assets/heart.svg" alt="logo" />
        <div class="flex-grow"></div>
        <el-menu-item index="1">欢迎</el-menu-item>
        <el-menu-item index="2">打铁助手</el-menu-item>
    </el-menu>
</template>
  
<script lang="ts" setup>
import { useMenuStore } from '../store/menu'

const menuStore = useMenuStore()
const activeIndex = menuStore.menuIndex
const handleSelect = (key: string, keyPath: string[]) => {
    menuStore.menuIndex = key
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
}
</script>
  
<style>
.flex-grow {
    flex-grow: 1;
}
</style>
  