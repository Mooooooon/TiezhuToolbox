<template>
    <el-text 
        class="mx-1" 
        :type="adbStore.status === 1 ? 'success' : 'danger'" 
        size="large">
        ADB状态: {{ adbStore.status === 1? '已连接' : '未连接' }}
    </el-text>
</template>

<script lang="ts" setup>
import { useAdbStore } from '../store/adb'

const adbStore = useAdbStore()
</script>