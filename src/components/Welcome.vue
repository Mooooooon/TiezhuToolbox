<template>
    <el-row>
        <el-autocomplete v-model="state" :fetch-suggestions="querySearch" placeholder="输入模拟器端口" @select="handleSelect"
            class="port-input" clearable>
            <template #default="{ item }">
                <span class="name">{{ item.name }}</span>
                <span class="value">{{ item.value }}</span>
            </template>
        </el-autocomplete>
    </el-row>
    <el-row>
        <el-button @click="connectADB">连接</el-button>
    </el-row>
</template>
  
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exec } from 'child_process'
import { useAdbStore } from '../store/adb'
import path from 'path'

const adbStore = useAdbStore()

interface NameItem {
    value: string
    name: string
}

const state = ref('')
const names = ref<NameItem[]>([])

const querySearch = (queryString: string, cb: (arg0: { value: string; name: string }[]) => void) => {
    const results = queryString
        ? names.value.filter(createFilter(queryString))
        : names.value
    // call callback function to return suggestion objects
    cb(results)
}
const createFilter = (queryString: string) => {
    return (restaurant: { value: string }) => {
        return (
            restaurant.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
        )
    }
}
const loadAll = () => {
    return [
        { value: '62001', name: '夜神模拟器' },
        { value: '16384', name: 'MuMu模拟器 12' },
        { value: '7555', name: 'MuMu模拟器 6' },
        { value: '6555', name: '天天模拟器' },
        { value: '5555', name: 'BlueStacks' },
    ]
}
const handleSelect = (item: NameItem) => {
    console.log(item)
}

const connectADB = () => {
    ElMessage('模拟器连接中……')
    const adbPath = path.join(process.cwd(), 'platform-tools', 'adb.exe')
    exec(adbPath + ' connect 127.0.0.1:' + state.value, (error, stdout, stderr) => {
        ElMessage.closeAll()
        if (error) {
            ElMessage.error(error.message)
            return
        }
        if (stderr) {
            ElMessage.error(stderr)
            return
        }
        if (stdout.includes("connected to")) {
            ElMessage({
                message: '模拟器连接成功。',
                type: 'success',
            })
            adbStore.status = 1
        } else {
            ElMessage.error('模拟器连接失败。')
        }
    })
}

onMounted(() => {
    names.value = loadAll()
})
</script>
  
<style>
.port-input {
    width: 220px;
}

.name {
    width: 65%;
    display: block;
    float: left;
}

.value {
    width: 35%;
    display: block;
    float: left;
}

.el-row {
    margin-bottom: 10px;
}
</style>
  