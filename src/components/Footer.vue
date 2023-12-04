<template>
    <el-text 
        class="mx-1" 
        :type="adbStore.status === '模拟器连接成功' ? 'success' : 'danger'" 
        size="large">
        ADB状态: {{ adbStore.status }}
    </el-text>
</template>

<script lang="ts" setup>
import { useAdbStore } from '../store/adb'

const adbStore = useAdbStore()
</script>