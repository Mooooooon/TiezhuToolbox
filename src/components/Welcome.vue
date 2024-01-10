<template>
    <el-row>
        <el-col :span="12">
            <el-row>
                <el-col>
                    <el-autocomplete v-model="state" :fetch-suggestions="querySearch" placeholder="输入模拟器端口"
                        @select="handleSelect" class="port-input" clearable>
                        <template #default="{ item }">
                            <span class="name">{{ item.name }}</span>
                            <span class="value">{{ item.value }}</span>
                        </template>
                    </el-autocomplete>
                </el-col>
            </el-row>
            <el-row>
                <el-col>
                    <el-button @click="connectADB">连接</el-button>
                </el-col>
            </el-row>
            <el-row>
                <el-col>
                    <el-select v-model="value" placeholder="选择模拟器" @change="handleChange" class="device-select">
                        <el-option v-for="item in options" :value="item.value" />
                    </el-select>
                </el-col>
            </el-row>
        </el-col>
        <el-col :span="12">
            <el-row>
                <el-text type="danger">仅支持16:9 分辨率请勿太低</el-text>
            </el-row>
            <el-row>
                <el-text>输入端口号后连接模拟器 默认端口号不一定对请自己查看</el-text>
            </el-row>
            <el-row>
                <el-text type="danger">可以自己输入！默认没有不代表不支持！请自己百度！</el-text>
            </el-row>
            <el-row>
                <el-text>以</el-text><el-text type="danger">85红装</el-text><el-text>为基础制作 其他等级仅供参考</el-text>
            </el-row>
            <el-row>
                <el-text>纯速度装请自行斟酌</el-text>
            </el-row>
            <el-row>
                <el-text>+6成本较低 +3后不推荐的装备也可以考虑强化</el-text>
            </el-row>
            <el-row>
                <el-text>项链暴击爆伤赚分 鞋子速度赚分 其他亏分请自行斟酌！</el-text>
            </el-row>
            <el-row>
                <el-link href="https://github.com/Mooooooon/TiezhuToolbox" type="primary" target="_blank">Github</el-link>
                <el-text>👈给我点个Star吧⭐</el-text>
            </el-row>
            <el-row>
                <el-link href="https://nga.178.com/read.php?tid=38731315" type="primary" target="_blank">NGA </el-link>
                <el-text>👈Bug反馈点此(或者去Github提issue)</el-text>
            </el-row>
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

const adbStore = useAdbStore()
const value = ref(adbStore.device)
interface NameItem {
    value: string
    name: string
}

const state = ref('')
const names = ref<NameItem[]>([])
const options = ref<NameItem[]>([])

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
        { value: '21503', name: '逍遥模拟器' },
        { value: '16384', name: 'MuMu模拟器 12' },
        { value: '7555', name: 'MuMu模拟器 6' },
        { value: '6555', name: '天天模拟器' },
        { value: '5555', name: 'BlueStacks' },
        { value: '5555', name: '雷电模拟器' },
    ]
}
const handleSelect = (item: NameItem) => {
    console.log(item)
    adbStore.port = item.value
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
                options.value = devices  // 更新 Pinia store 中的设备列表
                adbStore.deviceList = options.value
                console.log('更新后的设备:', options.value)

                // 自动选择选项
                if (options.value.length === 1) {
                    value.value = options.value[0].value
                    adbStore.device = options.value[0].value
                    console.log('自动选择的设备:', adbStore.device)
                }

                //检查adb位置
                exec("wmic process where \"name='adb.exe'\" get ExecutablePath", (error, stdout, stderr) => {
                    if (error) {
                        console.error(`检查adb位置 执行的错误: ${error}`)
                        return
                    }
                    console.log(`检查adb位置 标准输出: ${stdout}`)
                    // 解析 stdout 来找到您需要的信息
                })
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
    state.value = adbStore.port
    options.value = adbStore.deviceList
    checkForUpdates()
})

async function checkForUpdates() {
    try {
        const response = await axios.get('https://api.github.com/repos/Mooooooon/TiezhuToolbox/releases/latest')
        const latestVersion = response.data.tag_name

        // 比较最新版本和当前版本
        if (latestVersion !== '1.0.1') {
            // 有更新
            ElMessage({
                message: '程序有更新!请去Github或nga下载',
                type: 'success',
            })
        } else {
            // 那没事了
        }
    } catch (error) {
        console.error(error)
    }
}
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
  