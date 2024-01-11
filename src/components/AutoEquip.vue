<template>
    <el-row>
        <el-col :span="12">

        </el-col>
    </el-row>
</template>
  
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exec } from 'child_process'
import { useAdbStore } from '../store/adb'
import path from 'path'
const axios = require('axios')

onMounted(() => {

})
</script>
  
<style></style>
       