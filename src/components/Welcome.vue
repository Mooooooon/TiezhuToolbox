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
    <el-row>
        <el-select v-model="value" placeholder="选择模拟器" @change="handleChange" class="device-select">
            <el-option v-for="item in adbStore.deviceList" :value="item.value" />
        </el-select>
    </el-row>
</template>
  
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exec } from 'child_process'
import { useAdbStore } from '../store/adb'
import path from 'path'

const adbStore = useAdbStore()
const value = ref(adbStore.device)
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
const handleChange = (newValue: string) => {
    adbStore.device = newValue
    console.log('选择的设备已更新:', adbStore.device)
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
            exec(adbPath + ' devices', (error, stdout, stderr) => {
                if (error) {
                    console.error('获取设备列表失败:', error)
                    return
                }
                console.log('连接的设备:', stdout)
                // 分割字符串以获取设备列表
                let devices = stdout.split('\n')
                    .filter(line => line.includes('device'))
                    .map(line => {
                        const deviceValue = line.replace('device', '').trim()
                        return { value: deviceValue, name: deviceValue }
                    })
                if (devices.length > 0 && devices[0].value === 'List of s attached') {
                    devices = devices.slice(1) // 移除数组的第一个元素
                }
                adbStore.deviceList = devices  // 更新 Pinia store 中的设备列表
                console.log('更新后的设备:', adbStore.deviceList)
            })
        } else {
            ElMessage.error('模拟器连接失败。')
        }
    })
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
}

onMounted(() => {
    names.value = loadAll()
})
</script>
  
<style>
.port-input,
.device-select {
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
  