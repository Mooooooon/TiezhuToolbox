<template>
    <el-menu :default-active="activeIndex" class="toolbox-header-menu" mode="horizontal" :ellipsis="false"
        @select="handleSelect">
        <img style="width: 25px; padding: 0 20px;" src="../assets/heart.svg" alt="logo" />
        <div class="flex-grow" />
        <el-menu-item index="1">欢迎</el-menu-item>
        <el-menu-item index="2">打铁助手</el-menu-item>
    </el-menu>
</template>
  
<script lang="ts" setup>
import { ref } from 'vue'

const activeIndex = ref('1')
const handleSelect = (key: string, keyPath: string[]) => {
    console.log(key, keyPath)
}
</script>
  
<style>
.flex-grow {
    flex-grow: 1;
}

.el-menu-item:focus {
    background-color: Transparent !important;
}
</style>
  